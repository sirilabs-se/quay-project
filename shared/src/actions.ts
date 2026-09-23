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
	/** A browser-openable github.com URL (not the api.github.com one GitHub's API gives), or null when the subject type has none (e.g. a Discussion). */
	url: string | null;
	/** The issue/PR number, when `type` is "Issue" or "PullRequest" and it could be parsed out of the subject URL. */
	number: number | null;
}
