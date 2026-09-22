import { describe, expect, it } from "vitest";
import { parseFileDiff } from "../services/git/diff-parser.js";

const SAMPLE_DIFF = `diff --git a/src/Foo.java b/src/Foo.java
index abc123..def456 100644
--- a/src/Foo.java
+++ b/src/Foo.java
@@ -18,5 +18,6 @@ public class Foo {
     private final int a;
-    private static final long DELAY = 2000;
+    private static final long BASE = 500;
+    private static final long MAX = 30000;
     public void run() {
         return;
     }
`;

describe("parseFileDiff", () => {
	it("parses hunks with correct old/new line numbers", () => {
		const result = parseFileDiff("src/Foo.java", SAMPLE_DIFF);

		expect(result.binary).toBe(false);
		expect(result.hunks).toHaveLength(1);
		const hunk = result.hunks[0];
		expect(hunk.header).toBe("@@ -18,5 +18,6 @@ public class Foo {");
		expect(hunk.lines).toEqual([
			{ type: "context", oldLine: 18, newLine: 18, text: "    private final int a;" },
			{ type: "del", oldLine: 19, newLine: null, text: "    private static final long DELAY = 2000;" },
			{ type: "add", oldLine: null, newLine: 19, text: "    private static final long BASE = 500;" },
			{ type: "add", oldLine: null, newLine: 20, text: "    private static final long MAX = 30000;" },
			{ type: "context", oldLine: 20, newLine: 21, text: "    public void run() {" },
			{ type: "context", oldLine: 21, newLine: 22, text: "        return;" },
			{ type: "context", oldLine: 22, newLine: 23, text: "    }" }
		]);
	});

	it("detects binary files without attempting to parse hunks", () => {
		const output = "Binary files a/image.png and b/image.png differ\n";
		const result = parseFileDiff("image.png", output);
		expect(result.binary).toBe(true);
		expect(result.hunks).toEqual([]);
	});

	it("returns no hunks for an empty diff", () => {
		const result = parseFileDiff("unchanged.txt", "");
		expect(result.hunks).toEqual([]);
		expect(result.binary).toBe(false);
	});
});
