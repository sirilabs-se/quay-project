import type { CreateIssueInput, GitHubAccount, IssueSummary, Label } from "shared";
import { runGhAsAccount } from "./gh-cli.service.js";

const FIELDS = "number,title,state,author,assignees,labels,updatedAt";

interface GhIssueJson {
	number: number;
	title: string;
	state: string;
	author: { login: string } | null;
	assignees: { login: string }[] | null;
	labels: Label[] | null;
	updatedAt: string;
}

export function mapIssue(json: GhIssueJson): IssueSummary {
	return {
		number: json.number,
		title: json.title,
		state: json.state === "CLOSED" ? "closed" : "open",
		author: json.author?.login ?? "unknown",
		assignee: json.assignees?.[0]?.login ?? null,
		labels: (json.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
		updatedAt: json.updatedAt
	};
}

export type IssueStateFilter = "open" | "closed" | "all";

export class IssueService {
	async list(repoPath: string, account: GitHubAccount, filter: IssueStateFilter): Promise<IssueSummary[]> {
		const { stdout } = await runGhAsAccount(repoPath, account, ["issue", "list", "--json", FIELDS, "--state", filter, "-L", "100"]);
		return (JSON.parse(stdout) as GhIssueJson[]).map(mapIssue);
	}

	async create(repoPath: string, account: GitHubAccount, input: CreateIssueInput): Promise<IssueSummary> {
		const args = ["issue", "create", "--title", input.title, "--body", input.body];
		if (input.assignee) args.push("--assignee", input.assignee);
		const { stdout } = await runGhAsAccount(repoPath, account, args);
		const url = stdout.trim();
		const number = Number(url.split("/").pop());
		const { stdout: viewStdout } = await runGhAsAccount(repoPath, account, ["issue", "view", String(number), "--json", FIELDS]);
		return mapIssue(JSON.parse(viewStdout) as GhIssueJson);
	}
}
