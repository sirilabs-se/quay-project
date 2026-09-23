import type {
	Branch,
	CommitDetail,
	CommitSummary,
	FileDiff,
	Remote,
	Repository,
	RepositoryStatus,
	Stash,
	Tag
} from "shared";
import { apiFetch } from "./client";

export function listRepositories(): Promise<Repository[]> {
	return apiFetch("/api/repositories");
}

export function addRepository(path: string): Promise<Repository> {
	return apiFetch("/api/repositories", { method: "POST", body: JSON.stringify({ path }) });
}

export function removeRepository(id: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}`, { method: "DELETE" });
}

export function setFavorite(id: string, favorite: boolean): Promise<Repository> {
	return apiFetch(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify({ favorite }) });
}

export function getStatus(id: string): Promise<RepositoryStatus> {
	return apiFetch(`/api/repositories/${id}/status`);
}

export function getDiff(id: string, path: string, staged: boolean): Promise<FileDiff> {
	const query = new URLSearchParams({ path, staged: String(staged) });
	return apiFetch(`/api/repositories/${id}/diff?${query.toString()}`);
}

export function stageFiles(id: string, paths: string[]): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/stage`, { method: "POST", body: JSON.stringify({ paths }) });
}

export function unstageFiles(id: string, paths: string[]): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/unstage`, { method: "POST", body: JSON.stringify({ paths }) });
}

export function discardFile(id: string, path: string, untracked: boolean): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/discard`, { method: "POST", body: JSON.stringify({ path, untracked }) });
}

export function stageHunk(id: string, path: string, hunkIndex: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/hunks/stage`, { method: "POST", body: JSON.stringify({ path, hunkIndex }) });
}

export function unstageHunk(id: string, path: string, hunkIndex: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/hunks/unstage`, { method: "POST", body: JSON.stringify({ path, hunkIndex }) });
}

export function getConflictSides(id: string, path: string): Promise<{ ours: string; theirs: string }> {
	const query = new URLSearchParams({ path });
	return apiFetch(`/api/repositories/${id}/conflict?${query.toString()}`);
}

export function resolveConflict(id: string, path: string, mergedContent: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/conflict/resolve`, { method: "POST", body: JSON.stringify({ path, mergedContent }) });
}

export function continueMerge(id: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/merge/continue`, { method: "POST" });
}

export function rebase(id: string, onto: string): Promise<{ conflicts: string[] }> {
	return apiFetch(`/api/repositories/${id}/rebase`, { method: "POST", body: JSON.stringify({ onto }) });
}

export function continueRebase(id: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/rebase/continue`, { method: "POST" });
}

export function abortRebase(id: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/rebase/abort`, { method: "POST" });
}

export function resetHard(id: string, sha: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/reset`, { method: "POST", body: JSON.stringify({ sha }) });
}

export function commit(id: string, message: string, amend: boolean): Promise<CommitSummary | null> {
	return apiFetch(`/api/repositories/${id}/commit`, { method: "POST", body: JSON.stringify({ message, amend }) });
}

export function getBranches(id: string): Promise<Branch[]> {
	return apiFetch(`/api/repositories/${id}/branches`);
}

export function createBranch(id: string, name: string, base: string, checkout: boolean): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/branches`, { method: "POST", body: JSON.stringify({ name, base, checkout }) });
}

export function checkoutBranch(id: string, name: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/branches/checkout`, { method: "POST", body: JSON.stringify({ name }) });
}

export function deleteBranch(id: string, name: string, force: boolean): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/branches/delete`, { method: "POST", body: JSON.stringify({ name, force }) });
}

export function mergeBranch(id: string, name: string): Promise<{ conflicts: string[] }> {
	return apiFetch(`/api/repositories/${id}/merge`, { method: "POST", body: JSON.stringify({ name }) });
}

export function abortMerge(id: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/merge/abort`, { method: "POST" });
}

export function getHistory(id: string, limit?: number): Promise<CommitSummary[]> {
	const query = limit ? `?limit=${limit}` : "";
	return apiFetch(`/api/repositories/${id}/history${query}`);
}

export function getCommitDetail(id: string, sha: string): Promise<CommitDetail> {
	return apiFetch(`/api/repositories/${id}/commits/${sha}`);
}

export function getStashes(id: string): Promise<Stash[]> {
	return apiFetch(`/api/repositories/${id}/stashes`);
}

export function stashSave(id: string, message?: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/stashes`, { method: "POST", body: JSON.stringify({ message }) });
}

export function stashApply(id: string, index: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/stashes/apply`, { method: "POST", body: JSON.stringify({ index }) });
}

export function stashPop(id: string, index: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/stashes/pop`, { method: "POST", body: JSON.stringify({ index }) });
}

export function stashDrop(id: string, index: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/stashes/drop`, { method: "POST", body: JSON.stringify({ index }) });
}

export function getTags(id: string): Promise<Tag[]> {
	return apiFetch(`/api/repositories/${id}/tags`);
}

export function createTag(id: string, name: string, ref: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/tags`, { method: "POST", body: JSON.stringify({ name, ref }) });
}

export function getRemotes(id: string): Promise<Remote[]> {
	return apiFetch(`/api/repositories/${id}/remotes`);
}

export function addRemote(id: string, name: string, url: string): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${id}/remotes`, { method: "POST", body: JSON.stringify({ name, url }) });
}
