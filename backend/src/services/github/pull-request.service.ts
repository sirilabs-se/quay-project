import type { CheckStatus, CreatePullRequestInput, GitHubAccount, Label, PullRequestDetail, PullRequestSummary } from "shared";
import { getRepoNameWithOwner, runGhAsAccount } from "./gh-cli.service.js";

const SUMMARY_FIELDS = "number,title,state,isDraft,author,baseRefName,headRefName,labels,updatedAt,statusCheckRollup";
const DETAIL_FIELDS = `${SUMMARY_FIELDS},body,reviewDecision,commits,files`;

interface GhLabelJson {
	name: string;
	color: string;
}

export interface GhPrJson {
	number: number;
	title: string;
	state: string;
	isDraft: boolean;
	author: { login: string } | null;
	baseRefName: string;
	headRefName: string;
	labels: GhLabelJson[] | null;
	updatedAt: string;
	statusCheckRollup: unknown;
	body?: string;
	reviewDecision?: string | null;
	commits?: { oid: string; messageHeadline?: string; messageBody?: string }[];
	files?: { path: string; additions: number; deletions: number }[];
}

export function mapCheckStatus(rollup: unknown): CheckStatus {
	if (!Array.isArray(rollup) || rollup.length === 0) return "none";
	let hasFailure = false;
	let hasPending = false;
	for (const raw of rollup as Record<string, unknown>[]) {
		const conclusion = typeof raw.conclusion === "string" ? raw.conclusion.toUpperCase() : null;
		const state = typeof raw.state === "string" ? raw.state.toUpperCase() : null;
		const status = typeof raw.status === "string" ? raw.status.toUpperCase() : null;
		if (conclusion === "FAILURE" || conclusion === "TIMED_OUT" || conclusion === "CANCELLED" || state === "FAILURE" || state === "ERROR") {
			hasFailure = true;
		} else if (status === "QUEUED" || status === "IN_PROGRESS" || state === "PENDING") {
			hasPending = true;
		}
	}
	if (hasFailure) return "fail";
	if (hasPending) return "pending";
	return "pass";
}

export function mapSummary(json: GhPrJson): PullRequestSummary {
	return {
		number: json.number,
		title: json.title,
		state: json.state === "MERGED" ? "merged" : json.state === "CLOSED" ? "closed" : "open",
		draft: Boolean(json.isDraft),
		author: json.author?.login ?? "unknown",
		baseRefName: json.baseRefName,
		headRefName: json.headRefName,
		labels: (json.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
		updatedAt: json.updatedAt,
		checkStatus: mapCheckStatus(json.statusCheckRollup)
	};
}

export function mapDetail(json: GhPrJson): PullRequestDetail {
	return {
		...mapSummary(json),
		body: json.body ?? "",
		reviewDecision: json.reviewDecision || null,
		commits: (json.commits ?? []).map((c) => ({ sha: c.oid, message: c.messageHeadline ?? "" })),
		files: (json.files ?? []).map((f) => ({ path: f.path, additions: f.additions ?? 0, deletions: f.deletions ?? 0 }))
	};
}

export type PullRequestStateFilter = "open" | "closed" | "merged" | "all" | "draft";

export class PullRequestService {
	async list(repoPath: string, account: GitHubAccount, filter: PullRequestStateFilter): Promise<PullRequestSummary[]> {
		const ghState = filter === "draft" ? "open" : filter;
		const { stdout } = await runGhAsAccount(repoPath, account, ["pr", "list", "--json", SUMMARY_FIELDS, "--state", ghState, "-L", "100"]);
		const summaries = (JSON.parse(stdout) as GhPrJson[]).map(mapSummary);
		return filter === "draft" ? summaries.filter((p) => p.draft) : summaries;
	}

	async getDetail(repoPath: string, account: GitHubAccount, number: number): Promise<PullRequestDetail> {
		const { stdout } = await runGhAsAccount(repoPath, account, ["pr", "view", String(number), "--json", DETAIL_FIELDS]);
		return mapDetail(JSON.parse(stdout) as GhPrJson);
	}

	async create(repoPath: string, account: GitHubAccount, input: CreatePullRequestInput): Promise<PullRequestDetail> {
		const args = ["pr", "create", "--title", input.title, "--body", input.body, "--base", input.base, "--head", input.head];
		if (input.draft) args.push("--draft");
		for (const reviewer of input.reviewers) args.push("--reviewer", reviewer);
		for (const assignee of input.assignees) args.push("--assignee", assignee);
		for (const label of input.labels) args.push("--label", label);

		await runGhAsAccount(repoPath, account, args);
		const { stdout } = await runGhAsAccount(repoPath, account, ["pr", "view", input.head, "--json", "number"]);
		const { number } = JSON.parse(stdout) as { number: number };
		return this.getDetail(repoPath, account, number);
	}

	async merge(repoPath: string, account: GitHubAccount, number: number, method: "squash" | "merge" | "rebase", deleteBranch: boolean): Promise<void> {
		const methodFlag = method === "squash" ? "--squash" : method === "rebase" ? "--rebase" : "--merge";
		const args = ["pr", "merge", String(number), methodFlag];
		if (deleteBranch) args.push("--delete-branch");
		await runGhAsAccount(repoPath, account, args);
	}

	async close(repoPath: string, account: GitHubAccount, number: number): Promise<void> {
		await runGhAsAccount(repoPath, account, ["pr", "close", String(number)]);
	}

	async listLabels(repoPath: string, account: GitHubAccount): Promise<Label[]> {
		try {
			const { stdout } = await runGhAsAccount(repoPath, account, ["label", "list", "--json", "name,color", "-L", "100"]);
			return JSON.parse(stdout) as Label[];
		} catch {
			return [];
		}
	}

	async listCollaborators(repoPath: string, account: GitHubAccount): Promise<string[]> {
		try {
			const nameWithOwner = await getRepoNameWithOwner(repoPath, account);
			const { stdout } = await runGhAsAccount(repoPath, account, ["api", `repos/${nameWithOwner}/collaborators`, "--jq", ".[].login"]);
			return stdout
				.split("\n")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
		} catch {
			return [];
		}
	}
}
