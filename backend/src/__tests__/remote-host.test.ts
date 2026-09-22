import { describe, expect, it } from "vitest";
import { extractRemoteHostAlias, isHttpRemote } from "../services/github/remote-host.js";

describe("extractRemoteHostAlias", () => {
	it("extracts the host from an HTTPS remote", () => {
		expect(extractRemoteHostAlias("https://github.com/vikunalabs/commander.git")).toBe("github.com");
	});

	it("extracts the alias from an scp-like SSH remote", () => {
		expect(extractRemoteHostAlias("git@github-work:vikunalabs/commander.git")).toBe("github-work");
	});

	it("extracts the host from a plain SSH remote", () => {
		expect(extractRemoteHostAlias("git@github.com:vikunalabs/commander.git")).toBe("github.com");
	});

	it("extracts the host from a full ssh:// URL", () => {
		expect(extractRemoteHostAlias("ssh://git@github.com/vikunalabs/commander.git")).toBe("github.com");
	});

	it("returns null for an unrecognized format", () => {
		expect(extractRemoteHostAlias("not a url")).toBeNull();
	});
});

describe("isHttpRemote", () => {
	it("identifies http(s) remotes", () => {
		expect(isHttpRemote("https://github.com/x/y.git")).toBe(true);
		expect(isHttpRemote("http://github.com/x/y.git")).toBe(true);
	});

	it("rejects SSH remotes", () => {
		expect(isHttpRemote("git@github.com:x/y.git")).toBe(false);
		expect(isHttpRemote("ssh://git@github.com/x/y.git")).toBe(false);
	});
});
