import { describe, expect, it } from "vitest";
import { extractOwnerRepo } from "../services/github/remote-host.js";
import { mapRepo } from "../services/github/remote-repository.service.js";

describe("extractOwnerRepo", () => {
	it("extracts owner/repo from an HTTPS URL with .git", () => {
		expect(extractOwnerRepo("https://github.com/vikunalabs/commander.git")).toBe("vikunalabs/commander");
	});

	it("extracts owner/repo from an HTTPS URL without .git", () => {
		expect(extractOwnerRepo("https://github.com/vikunalabs/commander")).toBe("vikunalabs/commander");
	});

	it("extracts owner/repo from an scp-like SSH remote", () => {
		expect(extractOwnerRepo("git@github-work:vikunalabs/commander.git")).toBe("vikunalabs/commander");
	});

	it("extracts owner/repo from a full ssh:// URL", () => {
		expect(extractOwnerRepo("ssh://git@github.com/vikunalabs/commander.git")).toBe("vikunalabs/commander");
	});

	it("returns null for an unrecognized format", () => {
		expect(extractOwnerRepo("not a url")).toBeNull();
	});
});

describe("mapRepo", () => {
	it("maps a public repo, defaulting an empty description to null", () => {
		const result = mapRepo({
			name: "commander",
			nameWithOwner: "vikunalabs/commander",
			url: "https://github.com/vikunalabs/commander",
			isPrivate: false,
			description: "",
			updatedAt: "2026-09-22T10:00:00Z"
		});
		expect(result.description).toBeNull();
		expect(result.isPrivate).toBe(false);
	});

	it("keeps a real description", () => {
		const result = mapRepo({
			name: "commander",
			nameWithOwner: "vikunalabs/commander",
			url: "https://github.com/vikunalabs/commander",
			isPrivate: true,
			description: "A dispatch service",
			updatedAt: "2026-09-22T10:00:00Z"
		});
		expect(result.description).toBe("A dispatch service");
		expect(result.isPrivate).toBe(true);
	});
});
