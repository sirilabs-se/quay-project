import type { GitHubAccount } from "shared";

/**
 * Parses `gh auth status` output. gh already redacts the token value itself
 * (`gho_************************************`) in this output, so nothing
 * here ever sees or stores real credential material — per ARCHITECTURE.md
 * §9, credentials stay entirely in gh's own keyring/hosts.yml storage.
 */
export function parseGhAuthStatus(output: string): GitHubAccount[] {
	const accounts: GitHubAccount[] = [];
	let current: Partial<GitHubAccount> | null = null;

	const flush = (): void => {
		if (current?.host && current.login) {
			accounts.push({
				host: current.host,
				login: current.login,
				ghActive: current.ghActive ?? false,
				protocol: current.protocol ?? "https",
				scopes: current.scopes ?? [],
				keyringBacked: current.keyringBacked ?? false
			});
		}
		current = null;
	};

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0) continue;

		const loginMatch = line.match(/Logged in to (\S+) account (\S+)\s*\(([^)]*)\)/);
		if (loginMatch) {
			flush();
			current = {
				host: loginMatch[1],
				login: loginMatch[2],
				keyringBacked: loginMatch[3].toLowerCase().includes("keyring")
			};
			continue;
		}
		if (!current) continue;

		const activeMatch = line.match(/^-\s*Active account:\s*(true|false)/i);
		if (activeMatch) {
			current.ghActive = activeMatch[1].toLowerCase() === "true";
			continue;
		}
		const protocolMatch = line.match(/^-\s*Git operations protocol:\s*(\S+)/);
		if (protocolMatch) {
			current.protocol = protocolMatch[1];
			continue;
		}
		const scopesMatch = line.match(/^-\s*Token scopes:\s*(.*)$/);
		if (scopesMatch) {
			current.scopes = scopesMatch[1]
				.split(",")
				.map((s) => s.trim().replace(/^'|'$/g, ""))
				.filter((s) => s.length > 0);
		}
	}
	flush();

	return accounts;
}
