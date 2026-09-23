import type { GitHubAccount, RemoteRepository, RepositoryAccountInfo } from "shared";
import { apiFetch } from "./client";

export function listAccounts(): Promise<{ accounts: GitHubAccount[]; active: GitHubAccount | null }> {
	return apiFetch("/api/github/accounts");
}

export function switchAccount(host: string, login: string): Promise<GitHubAccount> {
	return apiFetch("/api/github/accounts/switch", { method: "POST", body: JSON.stringify({ host, login }) });
}

export function getRepositoryAccountInfo(repoId: string): Promise<RepositoryAccountInfo> {
	return apiFetch(`/api/repositories/${repoId}/account`);
}

/** The active account's own GitHub repos that aren't already registered locally. */
export function listRemoteRepos(): Promise<RemoteRepository[]> {
	return apiFetch("/api/github/repos");
}
