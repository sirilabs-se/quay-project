import path from "node:path";
import { describe, expect, it } from "vitest";
import { PathEscapesRepositoryError, resolveWithinRepo } from "../services/git/path-guard.js";

describe("resolveWithinRepo", () => {
	const repoRoot = "/home/user/code/commander";

	it("resolves a plain relative path inside the repo", () => {
		expect(resolveWithinRepo(repoRoot, "src/Foo.java")).toBe(path.join(repoRoot, "src/Foo.java"));
	});

	it("resolves the repo root itself", () => {
		expect(resolveWithinRepo(repoRoot, ".")).toBe(path.resolve(repoRoot));
	});

	it("rejects a path that escapes the repo root via ..", () => {
		expect(() => resolveWithinRepo(repoRoot, "../../etc/passwd")).toThrow(PathEscapesRepositoryError);
	});

	it("rejects an absolute path outside the repo", () => {
		expect(() => resolveWithinRepo(repoRoot, "/etc/passwd")).toThrow(PathEscapesRepositoryError);
	});

	it("rejects a sibling directory that merely shares a name prefix", () => {
		expect(() => resolveWithinRepo(repoRoot, "../commander-evil/secret")).toThrow(PathEscapesRepositoryError);
	});
});
