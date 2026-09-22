import { describe, expect, it } from "vitest";
import { parseStatus } from "../services/git/status-parser.js";

describe("parseStatus", () => {
	it("parses branch, ahead/behind, and staged/modified/untracked files", () => {
		const output = [
			"# branch.oid a91f2c4",
			"# branch.head feature/dispatch-retry",
			"# branch.upstream origin/feature/dispatch-retry",
			"# branch.ab +2 -1",
			"1 M. N... 100644 100644 100644 abc123 abc123 src/main/resources/application.yml",
			"1 .M N... 100644 100644 100644 def456 def456 src/main/java/Scheduler.java",
			"1 MM N... 100644 100644 100644 aaa111 aaa111 both/staged/and/modified.txt",
			"? src/test/NewTest.java"
		].join("\n");

		const result = parseStatus(output);

		expect(result.branch).toBe("feature/dispatch-retry");
		expect(result.ahead).toBe(2);
		expect(result.behind).toBe(1);
		expect(result.staged).toEqual([
			{ path: "src/main/resources/application.yml", flag: "M" },
			{ path: "both/staged/and/modified.txt", flag: "M" }
		]);
		expect(result.modified).toEqual([
			{ path: "src/main/java/Scheduler.java", flag: "M" },
			{ path: "both/staged/and/modified.txt", flag: "M" }
		]);
		expect(result.untracked).toEqual([{ path: "src/test/NewTest.java", flag: "?" }]);
	});

	it("reports a detached HEAD as no branch", () => {
		const result = parseStatus("# branch.head (detached)\n");
		expect(result.branch).toBeNull();
	});

	it("collects conflicted paths from unmerged entries", () => {
		const output = [
			"# branch.head main",
			"u UU N... 100644 100644 100644 100644 aaa bbb ccc src/Conflicted.java"
		].join("\n");
		const result = parseStatus(output);
		expect(result.conflicted).toEqual(["src/Conflicted.java"]);
	});

	it("returns empty lists for a clean working tree", () => {
		const result = parseStatus("# branch.head main\n# branch.ab +0 -0\n");
		expect(result.staged).toEqual([]);
		expect(result.modified).toEqual([]);
		expect(result.untracked).toEqual([]);
		expect(result.conflicted).toEqual([]);
	});
});
