import { describe, expect, it } from "vitest";
import { parseGhAuthStatus } from "../services/github/gh-auth-parser.js";

const SAMPLE_OUTPUT = `github.com
  ✓ Logged in to github.com account octocat (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'

  ✓ Logged in to github.com account octocat-work (keyring)
  - Active account: false
  - Git operations protocol: ssh
  - Token: gho_************************************
  - Token scopes: 'repo'
`;

describe("parseGhAuthStatus", () => {
	it("parses multiple accounts on the same host", () => {
		const accounts = parseGhAuthStatus(SAMPLE_OUTPUT);
		expect(accounts).toHaveLength(2);
		expect(accounts[0]).toEqual({
			host: "github.com",
			login: "octocat",
			ghActive: true,
			protocol: "https",
			scopes: ["gist", "read:org", "repo", "workflow"],
			keyringBacked: true
		});
		expect(accounts[1]).toMatchObject({ login: "octocat-work", ghActive: false, protocol: "ssh", scopes: ["repo"] });
	});

	it("detects plaintext (non-keyring) storage", () => {
		const output = "github.com\n  ✓ Logged in to github.com account octocat (/home/user/.config/gh/hosts.yml)\n  - Active account: true\n";
		const accounts = parseGhAuthStatus(output);
		expect(accounts[0].keyringBacked).toBe(false);
	});

	it("returns an empty list when logged into nothing", () => {
		expect(parseGhAuthStatus("You are not logged into any GitHub hosts.\n")).toEqual([]);
	});

	it("returns an empty list for empty input", () => {
		expect(parseGhAuthStatus("")).toEqual([]);
	});
});
