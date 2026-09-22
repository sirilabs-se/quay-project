import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

export interface ExecResult {
	stdout: string;
	stderr: string;
}

export class ExecError extends Error {
	constructor(
		message: string,
		public readonly code: number | null,
		public readonly stderr: string
	) {
		super(message);
		this.name = "ExecError";
	}
}

/**
 * Runs a binary with an argv array — the only sanctioned way to invoke
 * external processes anywhere in the backend. Never pass a shell string.
 */
export async function runProcess(
	binary: string,
	args: readonly string[],
	options: { timeoutMs?: number; cwd?: string } = {}
): Promise<ExecResult> {
	try {
		const { stdout, stderr } = await execFileAsync(binary, args, {
			timeout: options.timeoutMs ?? 10_000,
			cwd: options.cwd,
			shell: false
		});
		return { stdout: stdout.toString(), stderr: stderr.toString() };
	} catch (err) {
		const e = err as NodeJS.ErrnoException & { stderr?: string };
		if (e.code === "ENOENT") {
			throw new ExecError(`${binary} not found`, null, "");
		}
		const exitCode = typeof e.code === "number" ? e.code : null;
		throw new ExecError(e.message ?? `${binary} failed`, exitCode, e.stderr ?? "");
	}
}
