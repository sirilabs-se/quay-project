import { describe, expect, it } from "vitest";
import { GitHubAccountService } from "../services/github/github-account.service.js";

// Exercises the real `gh` binary in this environment (read-only: `gh auth
// status` only). Per ARCHITECTURE.md §12, tests never mutate a personal
// production account, so assertions stay structural rather than hardcoding
// this machine's specific logins.
describe("GitHubAccountService (integration, real gh binary)", () => {
	it("lists accounts with the expected shape", async () => {
		const service = new GitHubAccountService();
		const accounts = await service.listAccounts();
		expect(Array.isArray(accounts)).toBe(true);
		for (const account of accounts) {
			expect(typeof account.host).toBe("string");
			expect(typeof account.login).toBe("string");
			expect(typeof account.ghActive).toBe("boolean");
			expect(Array.isArray(account.scopes)).toBe(true);
		}
	});

	it("resolves a plain github.com HTTPS remote without needing SSH config", async () => {
		const service = new GitHubAccountService();
		const host = await service.resolveRemoteHost("https://github.com/octocat/hello-world.git");
		expect(host).toBe("github.com");
	});

	it("returns null host info for a repo with no remote", async () => {
		const service = new GitHubAccountService();
		const info = await service.getRepositoryAccountInfo(null);
		expect(info.resolvedHost).toBeNull();
		expect(info.resolvedAccount).toBeNull();
		expect(info.mismatch).toBe(false);
	});

	it("rejects switching to an account that isn't authenticated", async () => {
		const service = new GitHubAccountService();
		await expect(service.setActiveAccount("github.com", "definitely-not-a-real-login-xyz")).rejects.toThrow();
	});

	it("getActiveAccount falls back to gh's own active account or null when nothing is authenticated", async () => {
		const service = new GitHubAccountService();
		const accounts = await service.listAccounts();
		const active = await service.getActiveAccount();
		if (accounts.length === 0) {
			expect(active).toBeNull();
		} else {
			expect(active).not.toBeNull();
		}
	});
});
