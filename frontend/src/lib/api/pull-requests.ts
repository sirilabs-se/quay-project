import type { CreatePullRequestInput, Label, PullRequestDetail, PullRequestSummary } from "shared";
import { apiFetch } from "./client";

export type PullRequestStateFilter = "open" | "closed" | "merged" | "all" | "draft";

export function listPullRequests(repoId: string, state: PullRequestStateFilter): Promise<PullRequestSummary[]> {
	return apiFetch(`/api/repositories/${repoId}/pulls?state=${state}`);
}

export function getPullRequest(repoId: string, number: number): Promise<PullRequestDetail> {
	return apiFetch(`/api/repositories/${repoId}/pulls/${number}`);
}

export function createPullRequest(repoId: string, input: CreatePullRequestInput): Promise<PullRequestDetail> {
	return apiFetch(`/api/repositories/${repoId}/pulls`, { method: "POST", body: JSON.stringify(input) });
}

export function mergePullRequest(
	repoId: string,
	number: number,
	method: "squash" | "merge" | "rebase",
	deleteBranch: boolean
): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${repoId}/pulls/${number}/merge`, {
		method: "POST",
		body: JSON.stringify({ method, deleteBranch })
	});
}

export function closePullRequest(repoId: string, number: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${repoId}/pulls/${number}/close`, { method: "POST" });
}

export function getPullRequestMeta(repoId: string): Promise<{ labels: Label[]; collaborators: string[] }> {
	return apiFetch(`/api/repositories/${repoId}/pulls/meta`);
}
