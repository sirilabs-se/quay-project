/** Extracts the host (or SSH config alias) a remote URL points at, without resolving aliases yet. */
export function extractRemoteHostAlias(remoteUrl: string): string | null {
	const sshUrlMatch = remoteUrl.match(/^ssh:\/\/[^@/]+@([^/:]+)/);
	if (sshUrlMatch) return sshUrlMatch[1];

	// scp-like shorthand: user@host:owner/repo.git (host may be an SSH config alias)
	const scpMatch = remoteUrl.match(/^[^@\s/]+@([^:]+):/);
	if (scpMatch) return scpMatch[1];

	const httpMatch = remoteUrl.match(/^https?:\/\/(?:[^@/]+@)?([^/]+)/);
	if (httpMatch) return httpMatch[1];

	return null;
}

export function isHttpRemote(remoteUrl: string): boolean {
	return /^https?:\/\//.test(remoteUrl);
}

/** Extracts "owner/repo" from a remote URL (any form: https, scp-like SSH, ssh://), stripping a trailing .git. */
export function extractOwnerRepo(remoteUrl: string): string | null {
	const stripped = remoteUrl.replace(/\.git$/, "");

	const sshUrlMatch = stripped.match(/^ssh:\/\/[^@/]+@[^/:]+[/:](.+)$/);
	if (sshUrlMatch) return sshUrlMatch[1];

	const scpMatch = stripped.match(/^[^@\s/]+@[^:]+:(.+)$/);
	if (scpMatch) return scpMatch[1];

	const httpMatch = stripped.match(/^https?:\/\/(?:[^@/]+@)?[^/]+\/(.+)$/);
	if (httpMatch) return httpMatch[1];

	return null;
}
