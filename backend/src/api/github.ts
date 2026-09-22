import type { IncomingMessage, ServerResponse } from "node:http";
import { githubAccountService, gitService, repositoryService } from "./context.js";
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
