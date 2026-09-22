export interface GitHubAccount {
	host: string;
	login: string;
	/** Whichever account `gh`'s own global active-account state reports — informational only; Quay tracks its own session-local active account separately (§8). */
	ghActive: boolean;
	protocol: "https" | "ssh" | string;
	scopes: string[];
	keyringBacked: boolean;
}

export interface AccountSwitchRequest {
	host: string;
	login: string;
}

export interface RepositoryAccountInfo {
	/** The host the repo's remote resolves to (via SSH config alias resolution for SSH remotes). */
	resolvedHost: string | null;
	/** The single unambiguous account on that host, when exactly one is authenticated there. */
	resolvedAccount: GitHubAccount | null;
	/** Quay's current session-local active account. */
	activeAccount: GitHubAccount | null;
	mismatch: boolean;
}
