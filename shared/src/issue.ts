import type { Label } from "./pull-request.js";

export interface IssueSummary {
	number: number;
	title: string;
	state: "open" | "closed";
	author: string;
	assignee: string | null;
	labels: Label[];
	updatedAt: string;
}

export interface CreateIssueInput {
	title: string;
	body: string;
	assignee: string | null;
}
