import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreateReleaseInput, GitHubAccount } from "shared";
import { githubAccountService, releasesService, repositoryService } from "./context.js";
import { readJsonBody, sendJson } from "./respond.js";

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

export async function handleListReleases(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		const releases = await releasesService.list(repo.path, account);
		sendJson(res, 200, releases);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCreateRelease(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const body = await readJsonBody<Partial<CreateReleaseInput>>(req);
		if (!body.tag || !body.title) {
			sendJson(res, 400, { error: "bad_request", message: "tag and title are required" });
			return;
		}
		const repo = repositoryService.get(params.id);
		const release = await releasesService.createDraft(repo.path, account, {
			tag: body.tag,
			title: body.title,
			notes: body.notes ?? "",
			prerelease: Boolean(body.prerelease)
		});
		sendJson(res, 201, release);
	} catch (err) {
		handleError(res, err);
	}
}
