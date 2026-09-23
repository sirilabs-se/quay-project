import { describe, expect, it } from "vitest";
import type { GitHubAccount } from "shared";
import { GitHubAccountService } from "../services/github/github-account.service.js";

const WORK: GitHubAccount = { host: "github.com", login: "d2vk-work", ghActive: false, protocol: "https", scopes: [], keyringBacked: true };
const PERSONAL: GitHubAccount = { host: "github.com", login: "d2vk-personal", ghActive: true, protocol: "https", scopes: [], keyringBacked: true };
const ENTERPRISE: GitHubAccount = {
	host: "github.enterprise.example",
	login: "d2vk-client",
	ghActive: false,
	protocol: "https",
	scopes: [],
	keyringBacked: true
};

describe("GitHubAccountService.resolveAccountForRemote", () => {
	const service = new GitHubAccountService();

	it("resolves the single account on a host with only one candidate", async () => {
		const result = await service.resolveAccountForRemote("https://github.enterprise.example/owner/repo.git", [WORK, PERSONAL, ENTERPRISE]);
		expect(result.resolvedHost).toBe("github.enterprise.example");
		expect(result.resolvedAccount).toBe(ENTERPRISE);
	});

	it("returns null resolvedAccount when the host has more than one candidate", async () => {
		const result = await service.resolveAccountForRemote("https://github.com/owner/repo.git", [WORK, PERSONAL, ENTERPRISE]);
		expect(result.resolvedHost).toBe("github.com");
		expect(result.resolvedAccount).toBeNull();
	});

	it("returns null for a repo with no remote", async () => {
		const result = await service.resolveAccountForRemote(null, [WORK, PERSONAL]);
		expect(result.resolvedHost).toBeNull();
		expect(result.resolvedAccount).toBeNull();
	});

	it("returns null when no account is authenticated on the resolved host", async () => {
		const result = await service.resolveAccountForRemote("https://github.other.example/owner/repo.git", [WORK, PERSONAL]);
		expect(result.resolvedAccount).toBeNull();
	});
});
