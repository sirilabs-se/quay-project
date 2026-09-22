import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreateIssueInput, GitHubAccount } from "shared";
import type { IssueStateFilter } from "../services/github/issue.service.js";
import { githubAccountService, issueService, repositoryService } from "./context.js";
import { readJsonBody, sendJson } from "./respond.js";

async function requireActiveAccount(res: ServerResponse): Promise<GitHubAccount | null> {
	const account = await githubAccountService.getActiveAccount();
	if (!account) {
		sendJson(res, 400, { error: "no_active_account", message: "No gh-authenticated account is active. Run `gh auth login` first." });
		return null;
	}
	return account;
}

function queryParams(req: IncomingMessage): URLSearchParams {
	return new URL(req.url ?? "/", "http://internal").searchParams;
}

function handleError(res: ServerResponse, err: unknown): void {
	console.error(err);
	sendJson(res, 502, { error: "github_error", message: err instanceof Error ? err.message : "GitHub operation failed" });
}

export async function handleListIssues(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		const filter = (queryParams(req).get("state") ?? "open") as IssueStateFilter;
		const issues = await issueService.list(repo.path, account, filter);
		sendJson(res, 200, issues);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCreateIssue(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const body = await readJsonBody<Partial<CreateIssueInput>>(req);
		if (!body.title) {
			sendJson(res, 400, { error: "bad_request", message: "title is required" });
			return;
		}
		const repo = repositoryService.get(params.id);
		const issue = await issueService.create(repo.path, account, { title: body.title, body: body.body ?? "", assignee: body.assignee ?? null });
		sendJson(res, 201, issue);
	} catch (err) {
		handleError(res, err);
	}
}
