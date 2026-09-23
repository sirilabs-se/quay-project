import type { GitHubAccount } from "shared";
import { resolveAccountToken } from "./gh-cli.service.js";
import type { GitHubAccountService } from "./github-account.service.js";
import { isHttpRemote } from "./remote-host.js";

/**
 * A `git -c http.extraHeader=...` argument that authenticates as one
 * account for a single git invocation — the plain-git equivalent of
 * GH_TOKEN env injection for `gh` calls (gh-cli.service.ts). Scoped to one
 * process, never touches global git config or `gh auth switch`.
 */
export function basicAuthHeaderArgs(token: string): string[] {
	const encoded = Buffer.from(`x-access-token:${token}`).toString("base64");
	return ["-c", `http.extraHeader=AUTHORIZATION: basic ${encoded}`];
}

/**
 * Picks which account plain `git fetch`/`pull`/`push` over HTTPS should
 * authenticate as: the repo's own unambiguous account if one resolves,
 * else Quay's current session-local active account when its host matches
 * the remote (mirrors what the Overview mismatch banner already tells the
 * user will happen). Returns null for SSH remotes (key-based auth, no
 * token to inject) or when no matching account is found — callers should
 * fall back to running git with no extra auth args in that case, exactly
 * as it always has.
 */
export type AccountInfoLookup = Pick<GitHubAccountService, "getRepositoryAccountInfo">;

export async function resolveRemoteAccount(accountService: AccountInfoLookup, remoteUrl: string | null): Promise<GitHubAccount | null> {
	if (!remoteUrl || !isHttpRemote(remoteUrl)) return null;
	const info = await accountService.getRepositoryAccountInfo(remoteUrl);
	if (info.resolvedAccount) return info.resolvedAccount;
	if (info.activeAccount && info.activeAccount.host === info.resolvedHost) return info.activeAccount;
	return null;
}

/** Convenience: the argv-array to splice into a `git` command for this remote, or [] if no account applies. */
export async function remoteAuthArgs(accountService: GitHubAccountService, remoteUrl: string | null): Promise<string[]> {
	const account = await resolveRemoteAccount(accountService, remoteUrl);
	if (!account) return [];
	const token = await resolveAccountToken(account);
	return basicAuthHeaderArgs(token);
}
