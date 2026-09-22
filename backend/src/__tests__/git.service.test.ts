import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GitService, MergeConflictError } from "../services/git/git.service.js";
import { runProcess } from "../services/process/exec.js";
import { createTempRepo, writeAndCommit } from "./helpers/temp-repo.js";

let repoPath: string;
let git: GitService;

beforeEach(async () => {
	repoPath = await createTempRepo();
	git = new GitService();
});

afterEach(async () => {
	await rm(repoPath, { recursive: true, force: true });
});

describe("GitService.getStatus", () => {
	it("reports a clean working tree with no changes", async () => {
		const status = await git.getStatus(repoPath);
		expect(status.branch).toBe("main");
		expect(status.staged).toEqual([]);
		expect(status.modified).toEqual([]);
		expect(status.untracked).toEqual([]);
		expect(status.lastCommit?.message).toBe("Initial commit");
	});

	it("reports staged, modified, and untracked files separately", async () => {
		await writeFile(path.join(repoPath, "README.md"), "# Test repo\nmodified\n");
		await writeFile(path.join(repoPath, "staged.txt"), "staged content\n");
		await runProcess("git", ["-C", repoPath, "add", "staged.txt"]);
		await writeFile(path.join(repoPath, "new.txt"), "untracked\n");

		const status = await git.getStatus(repoPath);
		expect(status.modified.map((f) => f.path)).toEqual(["README.md"]);
		expect(status.staged.map((f) => f.path)).toEqual(["staged.txt"]);
		expect(status.untracked.map((f) => f.path)).toEqual(["new.txt"]);
	});
});

describe("GitService staging and commit", () => {
	it("stages and unstages a file", async () => {
		await writeFile(path.join(repoPath, "a.txt"), "a\n");
		await git.stageFiles(repoPath, ["a.txt"]);
		expect((await git.getStatus(repoPath)).staged.map((f) => f.path)).toEqual(["a.txt"]);

		await git.unstageFiles(repoPath, ["a.txt"]);
		const status = await git.getStatus(repoPath);
		expect(status.staged).toEqual([]);
		expect(status.untracked.map((f) => f.path)).toEqual(["a.txt"]);
	});

	it("discards changes to a tracked file", async () => {
		await writeFile(path.join(repoPath, "README.md"), "changed\n");
		await git.discardFile(repoPath, "README.md", false);
		const status = await git.getStatus(repoPath);
		expect(status.modified).toEqual([]);
	});

	it("deletes an untracked file when discarded", async () => {
		await writeFile(path.join(repoPath, "scratch.txt"), "temp\n");
		await git.discardFile(repoPath, "scratch.txt", true);
		const status = await git.getStatus(repoPath);
		expect(status.untracked).toEqual([]);
	});

	it("commits staged changes", async () => {
		await writeFile(path.join(repoPath, "b.txt"), "b\n");
		await git.stageFiles(repoPath, ["b.txt"]);
		const commit = await git.commit(repoPath, "Add b.txt", false);
		expect(commit?.message).toBe("Add b.txt");
		expect((await git.getStatus(repoPath)).staged).toEqual([]);
	});

	it("amends the previous commit", async () => {
		await writeFile(path.join(repoPath, "c.txt"), "c\n");
		await git.stageFiles(repoPath, ["c.txt"]);
		await git.commit(repoPath, "Add c.txt", false);

		await writeFile(path.join(repoPath, "d.txt"), "d\n");
		await git.stageFiles(repoPath, ["d.txt"]);
		const amended = await git.commit(repoPath, "Add c.txt and d.txt", true);
		expect(amended?.message).toBe("Add c.txt and d.txt");

		const log = await git.getLog(repoPath);
		expect(log).toHaveLength(2);
		expect(log[0].message).toBe("Add c.txt and d.txt");
	});
});

describe("GitService branches", () => {
	it("lists the default branch as current", async () => {
		const branches = await git.listBranches(repoPath);
		expect(branches).toHaveLength(1);
		expect(branches[0]).toMatchObject({ name: "main", current: true });
	});

	it("creates and checks out a new branch", async () => {
		await git.createBranch(repoPath, "feature/x", "main", true);
		const branches = await git.listBranches(repoPath);
		const feature = branches.find((b) => b.name === "feature/x");
		expect(feature?.current).toBe(true);
		expect(branches.find((b) => b.name === "main")?.current).toBe(false);
	});

	it("deletes a merged branch", async () => {
		await git.createBranch(repoPath, "throwaway", "main", false);
		await git.deleteBranch(repoPath, "throwaway", false);
		const branches = await git.listBranches(repoPath);
		expect(branches.find((b) => b.name === "throwaway")).toBeUndefined();
	});

	it("merges a fast-forwardable branch cleanly", async () => {
		await git.createBranch(repoPath, "feature/y", "main", true);
		await writeAndCommit(repoPath, "y.txt", "y\n", "Add y.txt");
		await git.checkoutBranch(repoPath, "main");

		const result = await git.mergeBranch(repoPath, "feature/y");
		expect(result.conflicts).toEqual([]);
		const status = await git.getStatus(repoPath);
		expect(status.lastCommit?.message).toBe("Add y.txt");
	});

	it("throws MergeConflictError and leaves conflict markers when branches conflict", async () => {
		await git.createBranch(repoPath, "feature/conflict", "main", true);
		await writeAndCommit(repoPath, "README.md", "# Test repo\nfrom feature\n", "Change on feature");
		await git.checkoutBranch(repoPath, "main");
		await writeAndCommit(repoPath, "README.md", "# Test repo\nfrom main\n", "Change on main");

		await expect(git.mergeBranch(repoPath, "feature/conflict")).rejects.toThrow(MergeConflictError);
		const status = await git.getStatus(repoPath);
		expect(status.merging).toBe(true);
		expect(status.mergeConflicts).toContain("README.md");

		await git.abortMerge(repoPath);
		expect((await git.getStatus(repoPath)).merging).toBe(false);
	});
});

describe("GitService history", () => {
	it("returns commits newest first with full detail", async () => {
		await writeAndCommit(repoPath, "e.txt", "e\n", "Add e.txt");
		const log = await git.getLog(repoPath);
		expect(log[0].message).toBe("Add e.txt");
		expect(log[1].message).toBe("Initial commit");

		const detail = await git.getCommitDetail(repoPath, log[0].sha);
		expect(detail.message).toBe("Add e.txt");
		expect(detail.files.map((f) => f.path)).toEqual(["e.txt"]);
	});
});

describe("GitService stashes", () => {
	it("saves, lists, and pops a stash", async () => {
		await writeFile(path.join(repoPath, "README.md"), "stashed change\n");
		await git.stashSave(repoPath, "WIP change");

		expect((await git.getStatus(repoPath)).modified).toEqual([]);
		const stashes = await git.listStashes(repoPath);
		expect(stashes).toHaveLength(1);
		expect(stashes[0].message).toContain("WIP change");

		await git.stashPop(repoPath, 0);
		expect((await git.getStatus(repoPath)).modified.map((f) => f.path)).toEqual(["README.md"]);
		expect(await git.listStashes(repoPath)).toEqual([]);
	});

	it("drops a stash without applying it", async () => {
		await writeFile(path.join(repoPath, "README.md"), "drop me\n");
		await git.stashSave(repoPath);
		await git.stashDrop(repoPath, 0);
		expect(await git.listStashes(repoPath)).toEqual([]);
		expect((await git.getStatus(repoPath)).modified).toEqual([]);
	});
});

describe("GitService tags", () => {
	it("creates and lists a tag", async () => {
		const log = await git.getLog(repoPath);
		await git.createTag(repoPath, "v1.0.0", log[0].sha);
		const tags = await git.listTags(repoPath);
		expect(tags).toHaveLength(1);
		expect(tags[0]).toMatchObject({ name: "v1.0.0" });
	});
});

describe("GitService remotes", () => {
	it("adds and lists a remote", async () => {
		await git.addRemote(repoPath, "origin", "https://example.com/repo.git");
		const remotes = await git.listRemotes(repoPath);
		expect(remotes).toEqual([{ name: "origin", fetchUrl: "https://example.com/repo.git", pushUrl: "https://example.com/repo.git" }]);
	});

	it("returns an empty list when there are no remotes", async () => {
		expect(await git.listRemotes(repoPath)).toEqual([]);
	});
});

describe("GitService diffs", () => {
	it("returns hunks for a modified tracked file", async () => {
		await writeFile(path.join(repoPath, "README.md"), "# Test repo\nmodified\n");
		const diff = await git.getFileDiff(repoPath, "README.md", false);
		expect(diff.binary).toBe(false);
		expect(diff.hunks.length).toBeGreaterThan(0);
	});

	it("returns an all-added diff for an untracked file", async () => {
		await writeFile(path.join(repoPath, "new.txt"), "line one\nline two\n");
		const diff = await git.getFileDiff(repoPath, "new.txt", false);
		expect(diff.hunks.length).toBeGreaterThan(0);
		expect(diff.hunks[0].lines.every((l) => l.type === "add")).toBe(true);
	});

	it("returns a diff for a staged file against --cached", async () => {
		await writeFile(path.join(repoPath, "staged.txt"), "staged\n");
		await git.stageFiles(repoPath, ["staged.txt"]);
		const diff = await git.getFileDiff(repoPath, "staged.txt", true);
		expect(diff.hunks.length).toBeGreaterThan(0);
	});
});

describe("GitService hunk staging", () => {
	it("stages only the selected hunk, leaving the other hunk unstaged", async () => {
		const lines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
		await writeAndCommit(repoPath, "multi.txt", lines, "Add multi.txt");

		const modified = lines.replace("line 2", "line 2 CHANGED").replace("line 28", "line 28 CHANGED");
		await writeFile(path.join(repoPath, "multi.txt"), modified);

		const before = await git.getFileDiff(repoPath, "multi.txt", false);
		expect(before.hunks.length).toBe(2);

		await git.stageHunk(repoPath, "multi.txt", 0, true);

		const stagedDiff = await git.getFileDiff(repoPath, "multi.txt", true);
		expect(stagedDiff.hunks.length).toBe(1);
		expect(stagedDiff.hunks[0].lines.some((l) => l.text.includes("line 2 CHANGED"))).toBe(true);

		const unstagedDiff = await git.getFileDiff(repoPath, "multi.txt", false);
		expect(unstagedDiff.hunks.length).toBe(1);
		expect(unstagedDiff.hunks[0].lines.some((l) => l.text.includes("line 28 CHANGED"))).toBe(true);
	});

	it("unstages a previously staged hunk", async () => {
		const lines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
		await writeAndCommit(repoPath, "multi2.txt", lines, "Add multi2.txt");
		const modified = lines.replace("line 2", "line 2 CHANGED").replace("line 28", "line 28 CHANGED");
		await writeFile(path.join(repoPath, "multi2.txt"), modified);

		await git.stageHunk(repoPath, "multi2.txt", 0, true);
		await git.stageHunk(repoPath, "multi2.txt", 0, false);

		expect((await git.getFileDiff(repoPath, "multi2.txt", true)).hunks).toEqual([]);
		expect((await git.getFileDiff(repoPath, "multi2.txt", false)).hunks.length).toBe(2);
	});
});

describe("GitService conflict resolution", () => {
	it("reads both sides of a conflict and resolves it", async () => {
		await git.createBranch(repoPath, "feature/conflict2", "main", true);
		await writeAndCommit(repoPath, "README.md", "# Test repo\nfrom feature\n", "Change on feature");
		await git.checkoutBranch(repoPath, "main");
		await writeAndCommit(repoPath, "README.md", "# Test repo\nfrom main\n", "Change on main");

		await expect(git.mergeBranch(repoPath, "feature/conflict2")).rejects.toThrow(MergeConflictError);

		const sides = await git.getConflictSides(repoPath, "README.md");
		expect(sides.ours).toContain("from main");
		expect(sides.theirs).toContain("from feature");

		await git.resolveConflictFile(repoPath, "README.md", "# Test repo\nresolved\n");
		expect((await git.getStatus(repoPath)).staged.map((f) => f.path)).toEqual(["README.md"]);

		await git.continueMerge(repoPath);
		const status = await git.getStatus(repoPath);
		expect(status.merging).toBe(false);
		expect(status.lastCommit?.message).toMatch(/Merge branch/);
	});
});

describe("GitService rebase", () => {
	it("rebases cleanly when there is no conflict", async () => {
		await git.createBranch(repoPath, "feature/rebase-clean", "main", true);
		await writeAndCommit(repoPath, "rebase-a.txt", "a\n", "Add rebase-a.txt");
		await git.checkoutBranch(repoPath, "main");
		await writeAndCommit(repoPath, "rebase-b.txt", "b\n", "Add rebase-b.txt");
		await git.checkoutBranch(repoPath, "feature/rebase-clean");

		const result = await git.rebaseBranch(repoPath, "main");
		expect(result.conflicts).toEqual([]);
		const log = await git.getLog(repoPath);
		expect(log.map((c) => c.message)).toContain("Add rebase-b.txt");
	});

	it("throws MergeConflictError on a conflicting rebase, and abort restores the branch", async () => {
		await git.createBranch(repoPath, "feature/rebase-conflict", "main", true);
		await writeAndCommit(repoPath, "README.md", "# Test repo\nfrom feature\n", "Change on feature for rebase");
		await git.checkoutBranch(repoPath, "main");
		await writeAndCommit(repoPath, "README.md", "# Test repo\nfrom main\n", "Change on main for rebase");
		await git.checkoutBranch(repoPath, "feature/rebase-conflict");

		await expect(git.rebaseBranch(repoPath, "main")).rejects.toThrow(MergeConflictError);
		await git.abortRebase(repoPath);

		const branches = await git.listBranches(repoPath);
		expect(branches.find((b) => b.name === "feature/rebase-conflict")?.current).toBe(true);
	});
});
