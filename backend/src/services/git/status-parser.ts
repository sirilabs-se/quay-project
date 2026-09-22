import type { FileChange, FileStatusFlag } from "shared";

export interface ParsedStatus {
	branch: string | null;
	ahead: number;
	behind: number;
	staged: FileChange[];
	modified: FileChange[];
	untracked: FileChange[];
	conflicted: string[];
}

function flagFromCode(code: string): FileStatusFlag {
	switch (code) {
		case "M":
			return "M";
		case "A":
			return "A";
		case "D":
			return "D";
		case "R":
		case "C":
			return "R";
		default:
			return "M";
	}
}

/** Ordinary entry (`1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>`) — path starts at field index 8. */
function ordinaryPath(fields: string[]): string {
	return fields.slice(8).join(" ");
}

/** Rename/copy entry (`2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <Xscore> <path>\t<origPath>`). */
function renamePath(fields: string[]): string {
	const combined = fields.slice(9).join(" ");
	const tabIndex = combined.indexOf("\t");
	return tabIndex === -1 ? combined : combined.slice(0, tabIndex);
}

/** Parses `git status --porcelain=v2 --branch` output (newline-separated). */
export function parseStatus(output: string): ParsedStatus {
	const result: ParsedStatus = {
		branch: null,
		ahead: 0,
		behind: 0,
		staged: [],
		modified: [],
		untracked: [],
		conflicted: []
	};

	for (const line of output.split("\n")) {
		if (line.length === 0) continue;

		if (line.startsWith("# branch.head ")) {
			const head = line.slice("# branch.head ".length).trim();
			result.branch = head === "(detached)" ? null : head;
			continue;
		}
		if (line.startsWith("# branch.ab ")) {
			const match = line.match(/^# branch\.ab \+(\d+) -(\d+)/);
			if (match) {
				result.ahead = Number(match[1]);
				result.behind = Number(match[2]);
			}
			continue;
		}
		if (line.startsWith("#")) continue;

		const type = line[0];
		if (type === "1" || type === "2") {
			const fields = line.split(" ");
			const xy = fields[1];
			const filePath = type === "2" ? renamePath(fields) : ordinaryPath(fields);
			const [x, y] = xy;
			if (x !== ".") {
				result.staged.push({ path: filePath, flag: flagFromCode(x) });
			}
			if (y !== ".") {
				result.modified.push({ path: filePath, flag: flagFromCode(y) });
			}
		} else if (type === "u") {
			// Unmerged: `u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>` — path is field index 10.
			const fields = line.split(" ");
			result.conflicted.push(fields.slice(10).join(" "));
		} else if (type === "?") {
			result.untracked.push({ path: line.slice(2), flag: "?" });
		}
	}

	return result;
}
