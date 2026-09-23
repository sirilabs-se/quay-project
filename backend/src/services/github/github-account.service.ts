import type { GitHubAccount, RepositoryAccountInfo } from "shared";
import { parseGhAuthStatus } from "./gh-auth-parser.js";
import { extractRemoteHostAlias, isHttpRemote } from "./remote-host.js";
import { readSshConfig, resolveSshAliasHost } from "./ssh-config.js";
import { ExecError, runProcess } from "../process/exec.js";

/**
 * Quay's "active account" is a value this service holds for the lifetime of
 * the backend process (§8: "session-local only") and passes explicitly on
 * every call that needs it — Quay never runs `gh auth switch`, which would
 * change gh's *global* active account and silently affect every other
 * terminal session on the machine.
 */
export class GitHubAccountService {
	private sessionActive: { host: string; login: string } | null = null;

	async listAccounts(): Promise<GitHubAccount[]> {
		try {
			const { stdout, stderr } = await runProcess("gh", ["auth", "status"]);
			const parsed = parseGhAuthStatus(stdout);
			return parsed.length > 0 ? parsed : parseGhAuthStatus(stderr);
		} catch (err) {
			if (err instanceof ExecError) {
				const parsed = parseGhAuthStatus(err.stdout);
				return parsed.length > 0 ? parsed : parseGhAuthStatus(err.stderr);
			}
			throw err;
		}
	}

	async getActiveAccount(): Promise<GitHubAccount | null> {
		const accounts = await this.listAccounts();
		if (this.sessionActive) {
			const match = accounts.find((a) => a.host === this.sessionActive!.host && a.login === this.sessionActive!.login);
			if (match) return match;
		}
		return accounts.find((a) => a.ghActive) ?? accounts[0] ?? null;
	}

	async setActiveAccount(host: string, login: string): Promise<GitHubAccount> {
		const accounts = await this.listAccounts();
		const match = accounts.find((a) => a.host === host && a.login === login);
		if (!match) {
			throw new Error(`No authenticated account ${login} on ${host}`);
		}
		this.sessionActive = { host, login };
		return match;
	}

	async resolveRemoteHost(remoteUrl: string | null): Promise<string | null> {
		if (!remoteUrl) return null;
		const aliasOrHost = extractRemoteHostAlias(remoteUrl);
		if (!aliasOrHost) return null;
		if (isHttpRemote(remoteUrl)) return aliasOrHost;
		const entries = await readSshConfig();
		return resolveSshAliasHost(aliasOrHost, entries);
	}

	async getRepositoryAccountInfo(remoteUrl: string | null): Promise<RepositoryAccountInfo> {
		const [accounts, activeAccount] = await Promise.all([this.listAccounts(), this.getActiveAccount()]);
		const { resolvedHost, resolvedAccount } = await this.resolveAccountForRemote(remoteUrl, accounts);

		const mismatch = Boolean(
			resolvedAccount && activeAccount && (resolvedAccount.host !== activeAccount.host || resolvedAccount.login !== activeAccount.login)
		);

		return { resolvedHost, resolvedAccount, activeAccount, mismatch };
	}

	/**
	 * Same resolution as getRepositoryAccountInfo but taking a pre-fetched
	 * account list — for callers resolving many repos at once (the
	 * repository list's per-repo accountLogin), where calling listAccounts()
	 * (a `gh auth status` subprocess) once instead of once per repo actually
	 * matters.
	 */
	async resolveAccountForRemote(
		remoteUrl: string | null,
		accounts: GitHubAccount[]
	): Promise<{ resolvedHost: string | null; resolvedAccount: GitHubAccount | null }> {
		const resolvedHost = await this.resolveRemoteHost(remoteUrl);
		const candidatesOnHost = resolvedHost ? accounts.filter((a) => a.host === resolvedHost) : [];
		const resolvedAccount = candidatesOnHost.length === 1 ? candidatesOnHost[0] : null;
		return { resolvedHost, resolvedAccount };
	}
}
