import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "../../services/process/exec.js";

export async function createTempRepo(): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "quay-git-test-"));
	await runProcess("git", ["-C", dir, "init", "-b", "main"]);
	await runProcess("git", ["-C", dir, "config", "user.name", "Quay Test"]);
	await runProcess("git", ["-C", dir, "config", "user.email", "quay-test@example.com"]);
	await writeFile(path.join(dir, "README.md"), "# Test repo\n");
	await runProcess("git", ["-C", dir, "add", "."]);
	await runProcess("git", ["-C", dir, "commit", "-m", "Initial commit"]);
	return dir;
}

export async function writeAndCommit(dir: string, file: string, contents: string, message: string): Promise<void> {
	await writeFile(path.join(dir, file), contents);
	await runProcess("git", ["-C", dir, "add", "--", file]);
	await runProcess("git", ["-C", dir, "commit", "-m", message]);
}
