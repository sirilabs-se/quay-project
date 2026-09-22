import type { CreateIssueInput, IssueSummary } from "shared";
import { apiFetch } from "./client";

export type IssueStateFilter = "open" | "closed" | "all";

export function listIssues(repoId: string, state: IssueStateFilter): Promise<IssueSummary[]> {
	return apiFetch(`/api/repositories/${repoId}/issues?state=${state}`);
}

export function createIssue(repoId: string, input: CreateIssueInput): Promise<IssueSummary> {
	return apiFetch(`/api/repositories/${repoId}/issues`, { method: "POST", body: JSON.stringify(input) });
}
