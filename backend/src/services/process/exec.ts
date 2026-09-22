import { execFile as execFileCb, spawn } from "node:child_process";
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
		public readonly stderr: string,
		public readonly stdout: string = ""
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
	options: { timeoutMs?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<ExecResult> {
	try {
		const { stdout, stderr } = await execFileAsync(binary, args, {
			timeout: options.timeoutMs ?? 10_000,
			cwd: options.cwd,
			env: options.env,
			shell: false
		});
		return { stdout: stdout.toString(), stderr: stderr.toString() };
	} catch (err) {
		const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
		if (e.code === "ENOENT") {
			throw new ExecError(`${binary} not found`, null, "");
		}
		const exitCode = typeof e.code === "number" ? e.code : null;
		throw new ExecError(e.message ?? `${binary} failed`, exitCode, e.stderr ?? "", e.stdout ?? "");
	}
}

/** Runs a binary with argv arrays, writing `input` to its stdin — used for `git apply` (patch on stdin). */
export function runProcessWithInput(
	binary: string,
	args: readonly string[],
	input: string,
	options: { cwd?: string; timeoutMs?: number } = {}
): Promise<ExecResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(binary, args, { cwd: options.cwd, shell: false });
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill();
			reject(new ExecError(`${binary} timed out`, null, stderr, stdout));
		}, options.timeoutMs ?? 10_000);

		child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
		child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				reject(new ExecError(`${binary} exited with code ${code}`, code, stderr, stdout));
			}
		});
		child.stdin?.end(input);
	});
}

export interface StreamHandlers {
	onStdout?: (chunk: string) => void;
	onStderr?: (chunk: string) => void;
}

/**
 * Streams a binary's output line-by-line as it runs — used for long-running
 * operations (fetch/pull/push) whose progress is forwarded over WebSocket.
 * Same argv-array-only contract as runProcess.
 */
export function streamProcess(
	binary: string,
	args: readonly string[],
	options: { cwd?: string } & StreamHandlers = {}
): Promise<{ code: number | null }> {
	return new Promise((resolve, reject) => {
		const child = spawn(binary, args, { cwd: options.cwd, shell: false });
		child.stdout?.on("data", (chunk: Buffer) => options.onStdout?.(chunk.toString()));
		child.stderr?.on("data", (chunk: Buffer) => options.onStderr?.(chunk.toString()));
		child.on("error", (err) => reject(err));
		child.on("close", (code) => resolve({ code }));
	});
}
