import type { IncomingMessage, ServerResponse } from "node:http";
import { extractOwnerRepo } from "../services/github/remote-host.js";
import { githubAccountService, gitService, remoteRepositoryService, repositoryService } from "./context.js";
import { readJsonBody, sendJson } from "./respond.js";

export async function handleListAccounts(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const accounts = await githubAccountService.listAccounts();
	const active = await githubAccountService.getActiveAccount();
	sendJson(res, 200, { accounts, active });
}

export async function handleSwitchAccount(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const body = await readJsonBody<{ host?: string; login?: string }>(req);
	if (!body.host || !body.login) {
		sendJson(res, 400, { error: "bad_request", message: "host and login are required" });
		return;
	}
	try {
		const account = await githubAccountService.setActiveAccount(body.host, body.login);
		sendJson(res, 200, account);
	} catch (err) {
		sendJson(res, 404, { error: "not_found", message: err instanceof Error ? err.message : "Account not found" });
	}
}

export async function handleListRemoteRepos(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const account = await githubAccountService.getActiveAccount();
	if (!account) {
		sendJson(res, 200, []);
		return;
	}
	try {
		const localRepos = repositoryService.list();
		const remoteRepos = await remoteRepositoryService.listForAccount(account);

		const localOwnerRepos = new Set<string>();
		await Promise.all(
			localRepos.map(async (repo) => {
				const remoteUrl = await gitService.getRemoteUrl(repo.path);
				const ownerRepo = remoteUrl ? extractOwnerRepo(remoteUrl) : null;
				if (ownerRepo) localOwnerRepos.add(ownerRepo.toLowerCase());
			})
		);

		const notYetLocal = remoteRepos.filter((r) => !localOwnerRepos.has(r.nameWithOwner.toLowerCase()));
		sendJson(res, 200, notYetLocal);
	} catch (err) {
		console.error(err);
		sendJson(res, 502, { error: "github_error", message: err instanceof Error ? err.message : "GitHub operation failed" });
	}
}

export async function handleRepositoryAccount(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const repo = repositoryService.get(params.id);
		const status = await gitService.getStatus(repo.path);
		const info = await githubAccountService.getRepositoryAccountInfo(status.remoteUrl);
		sendJson(res, 200, info);
	} catch (err) {
		sendJson(res, 404, { error: "not_found", message: err instanceof Error ? err.message : "Repository not found" });
	}
}
