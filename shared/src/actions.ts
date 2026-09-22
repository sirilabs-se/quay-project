export type WorkflowRunStatus = "pass" | "fail" | "running";

export interface WorkflowRun {
	id: number;
	name: string;
	branch: string;
	status: WorkflowRunStatus;
	sha: string;
	updatedAt: string;
}

export interface Release {
	tag: string;
	title: string;
	publishedAt: string;
	prerelease: boolean;
	draft: boolean;
}

export interface CreateReleaseInput {
	tag: string;
	title: string;
	notes: string;
	prerelease: boolean;
}

export interface GitHubNotification {
	id: string;
	unread: boolean;
	reason: string;
	title: string;
	type: string;
	repo: string;
	updatedAt: string;
	url: string | null;
}
