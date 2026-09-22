import type { DiffHunk, DiffLine, FileDiff } from "shared";

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Parses a single file's unified diff, as produced by `git diff -- <path>`. */
export function parseFileDiff(path: string, output: string): FileDiff {
	if (output.includes("Binary files") && output.includes("differ")) {
		return { path, hunks: [], binary: true };
	}

	const hunks: DiffHunk[] = [];
	let current: DiffHunk | null = null;
	let oldLine = 0;
	let newLine = 0;

	for (const line of output.split("\n")) {
		const headerMatch = line.match(HUNK_HEADER);
		if (headerMatch) {
			oldLine = Number(headerMatch[1]);
			newLine = Number(headerMatch[2]);
			current = { header: line, lines: [] };
			hunks.push(current);
			continue;
		}
		if (!current) continue;

		if (line.startsWith("+") && !line.startsWith("+++")) {
			const diffLine: DiffLine = { type: "add", oldLine: null, newLine, text: line.slice(1) };
			current.lines.push(diffLine);
			newLine += 1;
		} else if (line.startsWith("-") && !line.startsWith("---")) {
			const diffLine: DiffLine = { type: "del", oldLine, newLine: null, text: line.slice(1) };
			current.lines.push(diffLine);
			oldLine += 1;
		} else if (line.startsWith(" ")) {
			const diffLine: DiffLine = { type: "context", oldLine, newLine, text: line.slice(1) };
			current.lines.push(diffLine);
			oldLine += 1;
			newLine += 1;
		}
		// Lines like "\ No newline at end of file" or diff/index headers are skipped.
	}

	return { path, hunks, binary: false };
}
