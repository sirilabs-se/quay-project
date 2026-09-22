export interface Label {
	name: string;
	color: string;
}

export type CheckStatus = "pass" | "fail" | "pending" | "none";

export interface PullRequestSummary {
	number: number;
	title: string;
	state: "open" | "closed" | "merged";
	draft: boolean;
	author: string;
	baseRefName: string;
	headRefName: string;
	labels: Label[];
	updatedAt: string;
	checkStatus: CheckStatus;
}

export interface PullRequestDetail extends PullRequestSummary {
	body: string;
	commits: { sha: string; message: string }[];
	files: { path: string; additions: number; deletions: number }[];
	reviewDecision: string | null;
}

export interface CreatePullRequestInput {
	title: string;
	body: string;
	base: string;
	head: string;
	draft: boolean;
	reviewers: string[];
	assignees: string[];
	labels: string[];
}
