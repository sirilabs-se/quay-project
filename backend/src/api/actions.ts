import type { IncomingMessage, ServerResponse } from "node:http";
import type { GitHubAccount } from "shared";
import { actionsService, githubAccountService, repositoryService } from "./context.js";
import { sendJson } from "./respond.js";

async function requireActiveAccount(res: ServerResponse): Promise<GitHubAccount | null> {
	const account = await githubAccountService.getActiveAccount();
	if (!account) {
		sendJson(res, 400, { error: "no_active_account", message: "No gh-authenticated account is active. Run `gh auth login` first." });
		return null;
	}
	return account;
}

function handleError(res: ServerResponse, err: unknown): void {
	console.error(err);
	sendJson(res, 502, { error: "github_error", message: err instanceof Error ? err.message : "GitHub operation failed" });
}

export async function handleListRuns(_req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		const runs = await actionsService.list(repo.path, account);
		sendJson(res, 200, runs);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleRerun(_req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		await actionsService.rerun(repo.path, account, Number(params.runId));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}
