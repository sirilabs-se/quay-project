import { unlink } from "node:fs/promises";
import type {
	Branch,
	CommitDetail,
	CommitSummary,
	FileChange,
	FileDiff,
	FileStatusFlag,
	Remote,
	RepositoryStatus,
	Stash,
	Tag
} from "shared";
import { parseFileDiff } from "./diff-parser.js";
import { assertWithinRepo, resolveWithinRepo } from "./path-guard.js";
import { parseStatus } from "./status-parser.js";
import { ExecError, runProcess } from "../process/exec.js";

const US = "\x1f"; // unit separator, used between pretty-format fields
const RS = "\x1e"; // record separator, used between commits
const COMMIT_FORMAT = `%H${US}%s${US}%an${US}%ae${US}%aI${RS}`;

export class MergeConflictError extends Error {
	constructor(public readonly conflicts: string[]) {
		super(`Merge produced conflicts in ${conflicts.length} file(s)`);
		this.name = "MergeConflictError";
	}
}

function parseCommitLine(line: string): CommitSummary {
	const [sha, message, author, authorEmail, date] = line.split(US);
	return { sha, message, author, authorEmail, date };
}

/** Runs git, treating exit code 1 as a normal (non-error) outcome — `git diff`/`git merge` use it for "differences found". */
async function runGitTolerant(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
	try {
		const { stdout, stderr } = await runProcess("git", ["-C", repoPath, ...args]);
		return { stdout, stderr, code: 0 };
	} catch (err) {
		if (err instanceof ExecError && err.code === 1) {
			return { stdout: err.stdout, stderr: err.stderr, code: 1 };
		}
		throw err;
	}
}

async function git(repoPath: string, args: string[]): Promise<string> {
	const { stdout } = await runProcess("git", ["-C", repoPath, ...args]);
	return stdout;
}

export class GitService {
	async getStatus(repoPath: string): Promise<RepositoryStatus> {
		const [statusOutput, remoteUrl, lastCommit] = await Promise.all([
			git(repoPath, ["status", "--porcelain=v2", "--branch"]),
			this.getRemoteUrl(repoPath, "origin"),
			this.getLastCommit(repoPath)
		]);
		const parsed = parseStatus(statusOutput);
		return {
			branch: parsed.branch,
			ahead: parsed.ahead,
			behind: parsed.behind,
			staged: parsed.staged,
			modified: parsed.modified,
			untracked: parsed.untracked,
			lastCommit,
			remoteUrl,
			merging: parsed.conflicted.length > 0,
			mergeConflicts: parsed.conflicted
		};
	}

	private async getRemoteUrl(repoPath: string, remoteName: string): Promise<string | null> {
		try {
			const stdout = await git(repoPath, ["remote", "get-url", remoteName]);
			return stdout.trim() || null;
		} catch {
			return null;
		}
	}

	private async getLastCommit(repoPath: string): Promise<CommitSummary | null> {
		try {
			const stdout = await git(repoPath, ["log", "-1", `--pretty=format:${COMMIT_FORMAT}`]);
			const line = stdout.split(RS)[0];
			return line ? parseCommitLine(line) : null;
		} catch {
			return null;
		}
	}

	async getFileDiff(repoPath: string, relativePath: string, staged: boolean): Promise<FileDiff> {
		assertWithinRepo(repoPath, relativePath);
		const args = staged ? ["diff", "--cached", "--", relativePath] : ["diff", "--", relativePath];
		const { stdout } = await runGitTolerant(repoPath, args);
		if (stdout.length === 0 && !staged) {
			// Untracked files don't show up in `git diff`; fall back to a synthetic all-added diff.
			return this.getUntrackedFileDiff(repoPath, relativePath);
		}
		return parseFileDiff(relativePath, stdout);
	}

	private async getUntrackedFileDiff(repoPath: string, relativePath: string): Promise<FileDiff> {
		const { stdout, code } = await runGitTolerant(repoPath, ["diff", "--no-index", "--", "/dev/null", relativePath]);
		if (code !== 0 && code !== 1) {
			return { path: relativePath, hunks: [], binary: false };
		}
		return parseFileDiff(relativePath, stdout);
	}

	async stageFiles(repoPath: string, relativePaths: string[]): Promise<void> {
		relativePaths.forEach((p) => assertWithinRepo(repoPath, p));
		await git(repoPath, ["add", "--", ...relativePaths]);
	}

	async unstageFiles(repoPath: string, relativePaths: string[]): Promise<void> {
		relativePaths.forEach((p) => assertWithinRepo(repoPath, p));
		await git(repoPath, ["restore", "--staged", "--", ...relativePaths]);
	}

	async discardFile(repoPath: string, relativePath: string, untracked: boolean): Promise<void> {
		assertWithinRepo(repoPath, relativePath);
		if (untracked) {
			await unlink(resolveWithinRepo(repoPath, relativePath));
		} else {
			await git(repoPath, ["checkout", "--", relativePath]);
		}
	}

	async commit(repoPath: string, message: string, amend: boolean): Promise<CommitSummary | null> {
		const args = amend ? ["commit", "--amend", "-m", message] : ["commit", "-m", message];
		await git(repoPath, args);
		return this.getLastCommit(repoPath);
	}

	async listBranches(repoPath: string): Promise<Branch[]> {
		const format = `%(refname:short)${US}%(HEAD)${US}%(upstream:short)${US}%(upstream:track)${US}%(committerdate:iso-strict)`;
		const stdout = await git(repoPath, ["for-each-ref", "refs/heads", `--format=${format}`]);
		return stdout
			.split("\n")
			.filter((line) => line.length > 0)
			.map((line) => {
				const [name, head, tracking, track, date] = line.split(US);
				const aheadMatch = track.match(/ahead (\d+)/);
				const behindMatch = track.match(/behind (\d+)/);
				return {
					name,
					current: head === "*",
					ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
					behind: behindMatch ? Number(behindMatch[1]) : 0,
					tracking: tracking || null,
					lastCommitDate: date || null
				};
			});
	}

	async createBranch(repoPath: string, name: string, base: string, checkout: boolean): Promise<void> {
		if (checkout) {
			await git(repoPath, ["checkout", "-b", name, base]);
		} else {
			await git(repoPath, ["branch", name, base]);
		}
	}

	async checkoutBranch(repoPath: string, name: string): Promise<void> {
		await git(repoPath, ["checkout", name]);
	}

	async deleteBranch(repoPath: string, name: string, force: boolean): Promise<void> {
		await git(repoPath, ["branch", force ? "-D" : "-d", name]);
	}

	async mergeBranch(repoPath: string, name: string): Promise<{ conflicts: string[] }> {
		const { code } = await runGitTolerant(repoPath, ["merge", "--no-edit", name]);
		if (code === 0) return { conflicts: [] };
		const status = parseStatus(await git(repoPath, ["status", "--porcelain=v2", "--branch"]));
		if (status.conflicted.length > 0) {
			throw new MergeConflictError(status.conflicted);
		}
		return { conflicts: [] };
	}

	async abortMerge(repoPath: string): Promise<void> {
		await git(repoPath, ["merge", "--abort"]);
	}

	async getLog(repoPath: string, limit = 200): Promise<CommitSummary[]> {
		const stdout = await git(repoPath, ["log", `-n`, String(limit), `--pretty=format:${COMMIT_FORMAT}`]);
		return stdout
			.split(RS)
			.map((line) => line.replace(/^\n/, ""))
			.filter((line) => line.length > 0)
			.map(parseCommitLine);
	}

	async getCommitDetail(repoPath: string, sha: string): Promise<CommitDetail> {
		const summaryFormat = `%H${US}%s${US}%an${US}%ae${US}%aI${US}%b`;
		const stdout = await git(repoPath, ["show", "-s", `--pretty=format:${summaryFormat}`, sha]);
		const [hash, subject, author, authorEmail, date, ...bodyParts] = stdout.split(US);
		const nameStatus = await git(repoPath, ["show", "--pretty=format:", "--name-status", sha]);
		const files: FileChange[] = nameStatus
			.split("\n")
			.filter((line) => line.trim().length > 0)
			.map((line) => {
				const [code, ...rest] = line.split("\t");
				return { path: rest.join("\t"), flag: (code[0] as FileStatusFlag) ?? "M" };
			});
		return {
			sha: hash,
			message: subject,
			author,
			authorEmail,
			date,
			body: bodyParts.join(US).trim(),
			files
		};
	}

	async listStashes(repoPath: string): Promise<Stash[]> {
		const format = `%gd${US}%s${US}%ci`;
		let stdout: string;
		try {
			stdout = await git(repoPath, ["stash", "list", `--pretty=format:${format}`]);
		} catch {
			return [];
		}
		return stdout
			.split("\n")
			.filter((line) => line.length > 0)
			.map((line, index) => {
				const [, message, date] = line.split(US);
				return { index, message, branch: this.branchFromStashMessage(message), date };
			});
	}

	private branchFromStashMessage(message: string): string {
		const match = message.match(/^(?:WIP on|On) ([^:]+):/);
		return match ? match[1] : "";
	}

	async stashSave(repoPath: string, message?: string): Promise<void> {
		const args = message ? ["stash", "push", "-m", message] : ["stash", "push"];
		await git(repoPath, args);
	}

	async stashApply(repoPath: string, index: number): Promise<void> {
		await git(repoPath, ["stash", "apply", `stash@{${index}}`]);
	}

	async stashPop(repoPath: string, index: number): Promise<void> {
		await git(repoPath, ["stash", "pop", `stash@{${index}}`]);
	}

	async stashDrop(repoPath: string, index: number): Promise<void> {
		await git(repoPath, ["stash", "drop", `stash@{${index}}`]);
	}

	async listTags(repoPath: string): Promise<Tag[]> {
		const format = `%(refname:short)${US}%(objectname:short)${US}%(creatordate:iso-strict)`;
		const stdout = await git(repoPath, ["for-each-ref", "refs/tags", `--format=${format}`]);
		return stdout
			.split("\n")
			.filter((line) => line.length > 0)
			.map((line) => {
				const [name, sha, date] = line.split(US);
				return { name, sha, date };
			});
	}

	async createTag(repoPath: string, name: string, ref: string): Promise<void> {
		await git(repoPath, ["tag", name, ref]);
	}

	async listRemotes(repoPath: string): Promise<Remote[]> {
		const names = (await git(repoPath, ["remote"])).split("\n").filter((n) => n.length > 0);
		const remotes = await Promise.all(
			names.map(async (name) => {
				const [fetchUrl, pushUrl] = await Promise.all([
					this.getRemoteUrl(repoPath, name),
					git(repoPath, ["remote", "get-url", "--push", name]).catch(() => "")
				]);
				return { name, fetchUrl: fetchUrl ?? "", pushUrl: pushUrl.trim() || (fetchUrl ?? "") };
			})
		);
		return remotes;
	}

	async addRemote(repoPath: string, name: string, url: string): Promise<void> {
		await git(repoPath, ["remote", "add", name, url]);
	}
}
