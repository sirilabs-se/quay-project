import type { GitHubAccount } from "shared";
import { runProcess, type ExecResult } from "../process/exec.js";

/**
 * Resolves a short-lived token for one account via `gh auth token`, used
 * only as an env var for a single `gh` child process invocation — never
 * logged, stored, or returned to the frontend. This is how Quay runs `gh`
 * commands as a specific account without ever calling `gh auth switch`
 * (which would change gh's *global* active account for every terminal on
 * the machine). ARCHITECTURE.md §8.
 */
export async function resolveAccountToken(account: GitHubAccount): Promise<string> {
	const { stdout } = await runProcess("gh", ["auth", "token", "--user", account.login, "--hostname", account.host]);
	return stdout.trim();
}

export async function runGhAsAccount(repoPath: string, account: GitHubAccount, args: readonly string[]): Promise<ExecResult> {
	const token = await resolveAccountToken(account);
	return runProcess("gh", args, {
		cwd: repoPath,
		env: { ...process.env, GH_TOKEN: token, GH_HOST: account.host }
	});
}

/** Same as runGhAsAccount but for account-level calls (notifications, user info) that aren't scoped to a repo. */
export async function runGhAsAccountGlobal(account: GitHubAccount, args: readonly string[]): Promise<ExecResult> {
	const token = await resolveAccountToken(account);
	return runProcess("gh", args, {
		env: { ...process.env, GH_TOKEN: token, GH_HOST: account.host }
	});
}

/** `owner/repo` for the repo at `repoPath`, as gh resolves it from the git remote. */
export async function getRepoNameWithOwner(repoPath: string, account: GitHubAccount): Promise<string> {
	const { stdout } = await runGhAsAccount(repoPath, account, ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
	return stdout.trim();
}
