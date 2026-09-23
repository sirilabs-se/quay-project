import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { githubAccountService } from "../api/context.js";
import { isHostAllowed, type AuthConfig } from "../middleware/auth.js";
import { basicAuthHeaderArgs } from "../services/github/git-credential.js";
import { resolveAccountToken } from "../services/github/gh-cli.service.js";
import { streamProcess } from "../services/process/exec.js";

const wss = new WebSocketServer({ noServer: true });

/**
 * Same query-param-token pattern as ws/repository-actions.ts (browsers
 * can't set a custom header on a WS handshake) — see that file's comment
 * for why the token travels this way while Host/Origin stay real headers.
 */
export function handleCloneUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, config: AuthConfig): boolean {
	const url = new URL(req.url ?? "/", "http://internal");
	if (url.pathname !== "/ws/clone") return false;

	if (!isHostAllowed(req, config)) {
		socket.destroy();
		return true;
	}
	const origin = req.headers.origin;
	const token = url.searchParams.get("token");
	if (typeof origin !== "string" || !config.allowedOrigins.includes(origin) || token !== config.token) {
		socket.destroy();
		return true;
	}

	const nameWithOwner = url.searchParams.get("repo");
	const dest = url.searchParams.get("dest");
	if (!nameWithOwner || !dest) {
		socket.destroy();
		return true;
	}

	wss.handleUpgrade(req, socket, head, (ws) => {
		void runClone(ws, nameWithOwner, dest);
	});
	return true;
}

async function runClone(ws: WebSocket, nameWithOwner: string, dest: string): Promise<void> {
	const send = (type: string, data: string): void => {
		if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, data }));
	};

	try {
		const account = await githubAccountService.getActiveAccount();
		if (!account) {
			send("error", "No gh-authenticated account is active. Run `gh auth login` first.");
			return;
		}

		const cloneUrl = `https://${account.host}/${nameWithOwner}.git`;
		const token = await resolveAccountToken(account);
		const authArgs = basicAuthHeaderArgs(token);

		const { code } = await streamProcess("git", ["clone", ...authArgs, cloneUrl, dest], {
			onStdout: (chunk) => send("stdout", chunk),
			onStderr: (chunk) => send("stderr", chunk)
		});
		send("done", JSON.stringify({ code: code ?? -1, path: dest }));
	} catch (err) {
		send("error", err instanceof Error ? err.message : "Unknown error");
	} finally {
		ws.close();
	}
}
