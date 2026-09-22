import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { browseDirectory } from "../services/filesystem/browse.service.js";
import { runProcess } from "../services/process/exec.js";

let root: string;

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "quay-browse-test-"));
	await mkdir(path.join(root, "plain-folder"));
	await mkdir(path.join(root, "a-repo"));
	await runProcess("git", ["-C", path.join(root, "a-repo"), "init", "-q"]);
	await mkdir(path.join(root, ".hidden"));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("browseDirectory", () => {
	it("lists subdirectories, flags git repos, and hides dotfiles", async () => {
		const result = await browseDirectory(root);
		expect(result.path).toBe(root);
		const names = result.entries.map((e) => e.name);
		expect(names).toEqual(["a-repo", "plain-folder"]);
		expect(result.entries.find((e) => e.name === "a-repo")?.isGitRepo).toBe(true);
		expect(result.entries.find((e) => e.name === "plain-folder")?.isGitRepo).toBe(false);
	});

	it("reports the parent directory, and null at the filesystem root", async () => {
		const result = await browseDirectory(root);
		expect(result.parent).toBe(path.dirname(root));

		const rootResult = await browseDirectory(path.parse(root).root);
		expect(rootResult.parent).toBeNull();
	});

	it("defaults to the home directory when no path is given", async () => {
		const result = await browseDirectory();
		expect(result.path).toBe(os.homedir());
	});

	it("throws a clear error for a path that does not exist", async () => {
		await expect(browseDirectory(path.join(root, "nope"))).rejects.toThrow(/does not exist/);
	});

	it("throws a clear error when the path is a file, not a directory", async () => {
		const filePath = path.join(root, "a-repo", ".git", "HEAD");
		await expect(browseDirectory(filePath)).rejects.toThrow(/not a directory/);
	});
});
