import type { IncomingMessage, ServerResponse } from "node:http";
import type { Repository } from "shared";
import { MergeConflictError } from "../services/git/git.service.js";
import { PathEscapesRepositoryError } from "../services/git/path-guard.js";
import { InvalidRepositoryPathError, RepositoryNotFoundError } from "../services/repository/repository.service.js";
import { githubAccountService, gitService, operationQueue, repoWatcher, repositoryService } from "./context.js";
import { readJsonBody, sendJson } from "./respond.js";

function handleError(res: ServerResponse, err: unknown): void {
	if (err instanceof RepositoryNotFoundError) {
		sendJson(res, 404, { error: "not_found", message: err.message });
		return;
	}
	if (err instanceof InvalidRepositoryPathError || err instanceof PathEscapesRepositoryError) {
		sendJson(res, 400, { error: "bad_request", message: err.message });
		return;
	}
	if (err instanceof MergeConflictError) {
		sendJson(res, 409, { error: "merge_conflict", message: err.message, conflicts: err.conflicts });
		return;
	}
	console.error(err);
	sendJson(res, 500, { error: "internal_error", message: err instanceof Error ? err.message : "internal_error" });
}

function repoPath(id: string): string {
	return repositoryService.get(id).path;
}

function queryParams(req: IncomingMessage): URLSearchParams {
	return new URL(req.url ?? "/", "http://internal").searchParams;
}

/* ---------------------------------------------------------------- registry */

export async function handleListRepositories(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	try {
		const repos = repositoryService.list();
		const accounts = await githubAccountService.listAccounts();
		const withAccounts: Repository[] = await Promise.all(
			repos.map(async (repo) => {
				const remoteUrl = await gitService.getRemoteUrl(repo.path);
				const { resolvedAccount } = await githubAccountService.resolveAccountForRemote(remoteUrl, accounts);
				return { ...repo, accountLogin: resolvedAccount?.login ?? null };
			})
		);
		sendJson(res, 200, withAccounts);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleAddRepository(req: IncomingMessage, res: ServerResponse): Promise<void> {
	try {
		const body = await readJsonBody<{ path?: string }>(req);
		if (!body.path) {
			sendJson(res, 400, { error: "bad_request", message: "path is required" });
			return;
		}
		const repo = await repositoryService.add(body.path);
		repoWatcher.watchRepo(repo.id, repo.path);
		sendJson(res, 201, repo);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleRemoveRepository(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		repositoryService.remove(params.id);
		await repoWatcher.unwatchRepo(params.id);
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleUpdateRepository(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ favorite?: boolean }>(req);
		const repo = repositoryService.setFavorite(params.id, Boolean(body.favorite));
		sendJson(res, 200, repo);
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- status/diff */

export async function handleGetStatus(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		const status = await operationQueue.run(params.id, () => gitService.getStatus(path));
		sendJson(res, 200, status);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleGetDiff(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const query = queryParams(req);
		const filePath = query.get("path");
		const staged = query.get("staged") === "true";
		if (!filePath) {
			sendJson(res, 400, { error: "bad_request", message: "path query parameter is required" });
			return;
		}
		const path = repoPath(params.id);
		const diff = await operationQueue.run(params.id, () => gitService.getFileDiff(path, filePath, staged));
		sendJson(res, 200, diff);
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- staging/commit */

export async function handleStageFiles(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ paths?: string[] }>(req);
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stageFiles(path, body.paths ?? []));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleUnstageFiles(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ paths?: string[] }>(req);
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.unstageFiles(path, body.paths ?? []));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleDiscardFile(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ path?: string; untracked?: boolean }>(req);
		if (!body.path) {
			sendJson(res, 400, { error: "bad_request", message: "path is required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.discardFile(path, body.path!, Boolean(body.untracked)));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCommit(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ message?: string; amend?: boolean }>(req);
		if (!body.message) {
			sendJson(res, 400, { error: "bad_request", message: "message is required" });
			return;
		}
		const path = repoPath(params.id);
		const commit = await operationQueue.run(params.id, () => gitService.commit(path, body.message!, Boolean(body.amend)));
		sendJson(res, 200, commit);
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- branches */

export async function handleGetBranches(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		const branches = await operationQueue.run(params.id, () => gitService.listBranches(path));
		sendJson(res, 200, branches);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCreateBranch(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ name?: string; base?: string; checkout?: boolean }>(req);
		if (!body.name || !body.base) {
			sendJson(res, 400, { error: "bad_request", message: "name and base are required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.createBranch(path, body.name!, body.base!, Boolean(body.checkout)));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCheckoutBranch(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ name?: string }>(req);
		if (!body.name) {
			sendJson(res, 400, { error: "bad_request", message: "name is required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.checkoutBranch(path, body.name!));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleDeleteBranch(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ name?: string; force?: boolean }>(req);
		if (!body.name) {
			sendJson(res, 400, { error: "bad_request", message: "name is required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.deleteBranch(path, body.name!, Boolean(body.force)));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- merge */

export async function handleMergeBranch(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ name?: string }>(req);
		if (!body.name) {
			sendJson(res, 400, { error: "bad_request", message: "name is required" });
			return;
		}
		const path = repoPath(params.id);
		const result = await operationQueue.run(params.id, () => gitService.mergeBranch(path, body.name!));
		sendJson(res, 200, result);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleMergeAbort(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.abortMerge(path));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- history */

export async function handleGetHistory(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const limitParam = queryParams(req).get("limit");
		const limit = limitParam ? Number(limitParam) : undefined;
		const path = repoPath(params.id);
		const commits = await operationQueue.run(params.id, () => gitService.getLog(path, limit));
		sendJson(res, 200, commits);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCommitDetail(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		const detail = await operationQueue.run(params.id, () => gitService.getCommitDetail(path, params.sha));
		sendJson(res, 200, detail);
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- stashes */

export async function handleGetStashes(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		const stashes = await operationQueue.run(params.id, () => gitService.listStashes(path));
		sendJson(res, 200, stashes);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleStashSave(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ message?: string }>(req);
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stashSave(path, body.message));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleStashApply(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ index?: number }>(req);
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stashApply(path, body.index ?? 0));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleStashPop(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ index?: number }>(req);
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stashPop(path, body.index ?? 0));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleStashDrop(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ index?: number }>(req);
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stashDrop(path, body.index ?? 0));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- tags */

export async function handleGetTags(_req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const path = repoPath(params.id);
		const tags = await operationQueue.run(params.id, () => gitService.listTags(path));
		sendJson(res, 200, tags);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleCreateTag(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ name?: string; ref?: string }>(req);
		if (!body.name || !body.ref) {
			sendJson(res, 400, { error: "bad_request", message: "name and ref are required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.createTag(path, body.name!, body.ref!));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- remotes */

export async function handleGetRemotes(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		const remotes = await operationQueue.run(params.id, () => gitService.listRemotes(path));
		sendJson(res, 200, remotes);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleAddRemote(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ name?: string; url?: string }>(req);
		if (!body.name || !body.url) {
			sendJson(res, 400, { error: "bad_request", message: "name and url are required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.addRemote(path, body.name!, body.url!));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- hunk staging */

export async function handleStageHunk(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ path?: string; hunkIndex?: number }>(req);
		if (!body.path || body.hunkIndex === undefined) {
			sendJson(res, 400, { error: "bad_request", message: "path and hunkIndex are required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stageHunk(path, body.path!, body.hunkIndex!, true));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleUnstageHunk(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ path?: string; hunkIndex?: number }>(req);
		if (!body.path || body.hunkIndex === undefined) {
			sendJson(res, 400, { error: "bad_request", message: "path and hunkIndex are required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.stageHunk(path, body.path!, body.hunkIndex!, false));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- conflicts */

export async function handleGetConflictSides(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const filePath = queryParams(req).get("path");
		if (!filePath) {
			sendJson(res, 400, { error: "bad_request", message: "path query parameter is required" });
			return;
		}
		const path = repoPath(params.id);
		const sides = await operationQueue.run(params.id, () => gitService.getConflictSides(path, filePath));
		sendJson(res, 200, sides);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleResolveConflict(
	req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const body = await readJsonBody<{ path?: string; mergedContent?: string }>(req);
		if (!body.path || body.mergedContent === undefined) {
			sendJson(res, 400, { error: "bad_request", message: "path and mergedContent are required" });
			return;
		}
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.resolveConflictFile(path, body.path!, body.mergedContent!));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleContinueMerge(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.continueMerge(path));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

/* ---------------------------------------------------------------- rebase */

export async function handleRebase(req: IncomingMessage, res: ServerResponse, params: Record<string, string>): Promise<void> {
	try {
		const body = await readJsonBody<{ onto?: string }>(req);
		if (!body.onto) {
			sendJson(res, 400, { error: "bad_request", message: "onto is required" });
			return;
		}
		const path = repoPath(params.id);
		const result = await operationQueue.run(params.id, () => gitService.rebaseBranch(path, body.onto!));
		sendJson(res, 200, result);
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleContinueRebase(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.continueRebase(path));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}

export async function handleAbortRebase(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	try {
		const path = repoPath(params.id);
		await operationQueue.run(params.id, () => gitService.abortRebase(path));
		sendJson(res, 200, { ok: true });
	} catch (err) {
		handleError(res, err);
	}
}
