import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreatePullRequestInput, GitHubAccount } from "shared";
import type { PullRequestStateFilter } from "../services/github/pull-request.service.js";
import { githubAccountService, pullRequestService, repositoryService } from "./context.js";
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

export async function handleListPullRequests(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		const filter = (queryParams(req).get("state") ?? "open") as PullRequestStateFilter;
		const pulls = await pullRequestService.list(repo.path, account, filter);
		sendJson(res, 200, pulls);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleGetPullRequest(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		const pr = await pullRequestService.getDetail(repo.path, account, Number(params.number));
		sendJson(res, 200, pr);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCreatePullRequest(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const body = await readJsonBody<Partial<CreatePullRequestInput>>(req);
		if (!body.title || !body.base || !body.head) {
			sendJson(res, 400, { error: "bad_request", message: "title, base, and head are required" });
			return;
		}
		const repo = repositoryService.get(params.id);
		const input: CreatePullRequestInput = {
			title: body.title,
			body: body.body ?? "",
			base: body.base,
			head: body.head,
			draft: Boolean(body.draft),
			reviewers: body.reviewers ?? [],
			assignees: body.assignees ?? [],
			labels: body.labels ?? []
		};
		const pr = await pullRequestService.create(repo.path, account, input);
		sendJson(res, 201, pr);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleMergePullRequest(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const body = await readJsonBody<{ method?: "squash" | "merge" | "rebase"; deleteBranch?: boolean }>(req);
		const repo = repositoryService.get(params.id);
		await pullRequestService.merge(repo.path, account, Number(params.number), body.method ?? "squash", Boolean(body.deleteBranch));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleClosePullRequest(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		await pullRequestService.close(repo.path, account, Number(params.number));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handlePullRequestMeta(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const account = await requireActiveAccount(res);
		if (!account) return;
		const repo = repositoryService.get(params.id);
		const [labels, collaborators] = await Promise.all([
			pullRequestService.listLabels(repo.path, account),
			pullRequestService.listCollaborators(repo.path, account)
		]);
		sendJson(res, 200, { labels, collaborators });
	} catch (err) {
		handleError(res, err);
	}
}
