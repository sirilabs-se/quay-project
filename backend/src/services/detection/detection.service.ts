import type { BinaryDetectionResult, DetectionResponse } from "shared";
import { ExecError, runProcess } from "../process/exec.js";

/** Extracts a version token from `git version 2.55.0` / `gh version 2.100.0 (...)`. */
export function parseVersion(output: string): string | null {
	const match = output.match(/version\s+(\S+)/i);
	if (match) return match[1];
	const firstLine = output.trim().split("\n")[0];
	return firstLine.length > 0 ? firstLine : null;
}

async function detectBinary(name: "git" | "gh"): Promise<BinaryDetectionResult> {
	try {
		const { stdout } = await runProcess(name, ["--version"]);
		return { name, installed: true, version: parseVersion(stdout) };
	} catch (err) {
		if (err instanceof ExecError) {
			return { name, installed: false, version: null };
		}
		throw err;
	}
}

export async function detectBinaries(): Promise<DetectionResponse> {
	const [git, gh] = await Promise.all([detectBinary("git"), detectBinary("gh")]);
	return { git, gh };
}
