import { describe, expect, it } from "vitest";
import { parseSshConfigContent, resolveSshAliasHost } from "../services/github/ssh-config.js";

const SAMPLE_CONFIG = `
# personal
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal

Host github-work
  HostName github.com
  IdentityFile ~/.ssh/id_ed25519_work

Host github-client
  HostName github.client.example
`;

describe("parseSshConfigContent", () => {
	it("parses Host blocks with their HostName", () => {
		const entries = parseSshConfigContent(SAMPLE_CONFIG);
		expect(entries).toEqual([
			{ host: "github-personal", hostName: "github.com" },
			{ host: "github-work", hostName: "github.com" },
			{ host: "github-client", hostName: "github.client.example" }
		]);
	});

	it("returns an empty list for empty input", () => {
		expect(parseSshConfigContent("")).toEqual([]);
	});
});

describe("resolveSshAliasHost", () => {
	const entries = parseSshConfigContent(SAMPLE_CONFIG);

	it("resolves a known alias to its real host", () => {
		expect(resolveSshAliasHost("github-work", entries)).toBe("github.com");
	});

	it("falls back to the alias itself when unknown", () => {
		expect(resolveSshAliasHost("github.com", entries)).toBe("github.com");
	});
});
