import type { GitHubAccount, WorkflowRun, WorkflowRunStatus } from "shared";
import { runGhAsAccount } from "./gh-cli.service.js";

const FIELDS = "databaseId,workflowName,headBranch,status,conclusion,headSha,updatedAt";

interface GhRunJson {
	databaseId: number;
	workflowName: string;
	headBranch: string;
	status: string;
	conclusion: string | null;
	headSha: string;
	updatedAt: string;
}

export function mapRunStatus(status: string, conclusion: string | null): WorkflowRunStatus {
	if (status !== "completed") return "running";
	return conclusion === "success" ? "pass" : "fail";
}

function mapRun(json: GhRunJson): WorkflowRun {
	return {
		id: json.databaseId,
		name: json.workflowName,
		branch: json.headBranch,
		status: mapRunStatus(json.status, json.conclusion),
		sha: json.headSha,
		updatedAt: json.updatedAt
	};
}

export class ActionsService {
	async list(repoPath: string, account: GitHubAccount): Promise<WorkflowRun[]> {
		const { stdout } = await runGhAsAccount(repoPath, account, ["run", "list", "--json", FIELDS, "-L", "30"]);
		return (JSON.parse(stdout) as GhRunJson[]).map(mapRun);
	}

	async rerun(repoPath: string, account: GitHubAccount, runId: number): Promise<void> {
		await runGhAsAccount(repoPath, account, ["run", "rerun", String(runId)]);
	}
}
