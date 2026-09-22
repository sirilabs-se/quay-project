import type { CreateReleaseInput, GitHubNotification, Release, WorkflowRun } from "shared";
import { apiFetch } from "./client";

export function listRuns(repoId: string): Promise<WorkflowRun[]> {
	return apiFetch(`/api/repositories/${repoId}/actions`);
}

export function rerunWorkflow(repoId: string, runId: number): Promise<{ ok: true }> {
	return apiFetch(`/api/repositories/${repoId}/actions/${runId}/rerun`, { method: "POST" });
}

export function listReleases(repoId: string): Promise<Release[]> {
	return apiFetch(`/api/repositories/${repoId}/releases`);
}

export function createRelease(repoId: string, input: CreateReleaseInput): Promise<Release> {
	return apiFetch(`/api/repositories/${repoId}/releases`, { method: "POST", body: JSON.stringify(input) });
}

export function listNotifications(): Promise<GitHubNotification[]> {
	return apiFetch(`/api/notifications`);
}

export function markNotificationsRead(): Promise<{ ok: true }> {
	return apiFetch(`/api/notifications/mark-read`, { method: "POST" });
}
