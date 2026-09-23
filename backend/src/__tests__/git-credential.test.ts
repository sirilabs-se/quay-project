import { describe, expect, it } from "vitest";
import { basicAuthHeaderArgs, resolveRemoteAccount, type AccountInfoLookup } from "../services/github/git-credential.js";
import type { GitHubAccount, RepositoryAccountInfo } from "shared";

const WORK: GitHubAccount = {
	host: "github.com",
	login: "d2vk-work",
	ghActive: false,
	protocol: "https",
	scopes: ["repo"],
	keyringBacked: true
};

const PERSONAL: GitHubAccount = {
	host: "github.com",
	login: "d2vk-personal",
	ghActive: true,
	protocol: "https",
	scopes: ["repo"],
	keyringBacked: true
};

function lookup(info: Partial<RepositoryAccountInfo>): AccountInfoLookup {
	return {
		getRepositoryAccountInfo: async () => ({
			resolvedHost: null,
			resolvedAccount: null,
			activeAccount: null,
			mismatch: false,
			...info
		})
	};
}

describe("basicAuthHeaderArgs", () => {
	it("builds a git -c http.extraHeader argument pair with a base64 x-access-token credential", () => {
		const args = basicAuthHeaderArgs("gho_abc123");
		expect(args[0]).toBe("-c");
		expect(args[1]).toBe(`http.extraHeader=AUTHORIZATION: basic ${Buffer.from("x-access-token:gho_abc123").toString("base64")}`);
	});
});

describe("resolveRemoteAccount", () => {
	it("returns null for a non-HTTP (SSH) remote — key-based auth, nothing to inject", async () => {
		const account = await resolveRemoteAccount(lookup({}), "git@github.com:owner/repo.git");
		expect(account).toBeNull();
	});

	it("returns null when there's no remote at all", async () => {
		const account = await resolveRemoteAccount(lookup({}), null);
		expect(account).toBeNull();
	});

	it("prefers the repo's own unambiguously resolved account over the active one", async () => {
		const account = await resolveRemoteAccount(
			lookup({ resolvedHost: "github.com", resolvedAccount: WORK, activeAccount: PERSONAL, mismatch: true }),
			"https://github.com/owner/repo.git"
		);
		expect(account).toBe(WORK);
	});

	it("falls back to the active account when it matches the resolved host and no unambiguous repo account exists", async () => {
		const account = await resolveRemoteAccount(
			lookup({ resolvedHost: "github.com", resolvedAccount: null, activeAccount: PERSONAL }),
			"https://github.com/owner/repo.git"
		);
		expect(account).toBe(PERSONAL);
	});

	it("returns null when the active account's host doesn't match the remote's resolved host", async () => {
		const otherHostActive: GitHubAccount = { ...PERSONAL, host: "github.enterprise.example" };
		const account = await resolveRemoteAccount(
			lookup({ resolvedHost: "github.com", resolvedAccount: null, activeAccount: otherHostActive }),
			"https://github.com/owner/repo.git"
		);
		expect(account).toBeNull();
	});
});
