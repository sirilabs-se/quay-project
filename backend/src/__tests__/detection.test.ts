import { describe, expect, it } from "vitest";
import { detectBinaries, parseVersion } from "../services/detection/detection.service.js";
import { ExecError, runProcess } from "../services/process/exec.js";

describe("parseVersion", () => {
	it("extracts the version from git's output", () => {
		expect(parseVersion("git version 2.55.0")).toBe("2.55.0");
	});

	it("extracts the version from gh's output, ignoring trailing text", () => {
		expect(parseVersion("gh version 2.100.0 (2026-09-04)\nhttps://github.com/cli/cli")).toBe("2.100.0");
	});

	it("falls back to the first line when no 'version' token is present", () => {
		expect(parseVersion("unexpected output\nmore text")).toBe("unexpected output");
	});
});

describe("detectBinaries", () => {
	it("reports git as installed with a parsed version (git is a hard dependency of this environment)", async () => {
		const result = await detectBinaries();
		expect(result.git.installed).toBe(true);
		expect(result.git.version).toMatch(/^\d+\.\d+/);
	});
});

describe("runProcess", () => {
	it("throws ExecError for a binary that does not exist", async () => {
		await expect(runProcess("quay-definitely-not-a-real-binary", ["--version"])).rejects.toThrow(ExecError);
	});
});
