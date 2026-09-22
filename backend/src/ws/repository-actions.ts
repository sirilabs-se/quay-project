import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { operationQueue, repositoryService } from "../api/context.js";
import { isHostAllowed, type AuthConfig } from "../middleware/auth.js";
import { streamProcess } from "../services/process/exec.js";

const wss = new WebSocketServer({ noServer: true });

const ROUTE = /^\/ws\/repositories\/(?<id>[^/]+)\/(?<action>fetch|pull|push)$/;

type RemoteAction = "fetch" | "pull" | "push";

/**
 * Browsers can't set custom headers on a WebSocket handshake, so the session
 * token travels as a query parameter here instead of the x-quay-session-token
 * header used everywhere else. Host and Origin are still real browser-set
 * headers on the handshake request, so those are validated exactly as for
 * HTTP requests.
 */
export function handleRepositoryActionUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, config: AuthConfig): boolean {
	const url = new URL(req.url ?? "/", "http://internal");
	const match = url.pathname.match(ROUTE);
	if (!match) return false;

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

	const repoId = match.groups!.id;
	const action = match.groups!.action as RemoteAction;
	const remote = url.searchParams.get("remote") || "origin";

	wss.handleUpgrade(req, socket, head, (ws) => {
		void runRemoteAction(ws, repoId, action, remote);
	});
	return true;
}

async function runRemoteAction(ws: WebSocket, repoId: string, action: RemoteAction, remote: string): Promise<void> {
	const send = (type: string, data: string): void => {
		if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, data }));
	};

	try {
		const repo = repositoryService.get(repoId);
		const args = action === "fetch" ? ["fetch", remote] : action === "pull" ? ["pull", remote] : ["push", remote];

		const { code } = await operationQueue.run(repoId, () =>
			streamProcess("git", ["-C", repo.path, ...args], {
				onStdout: (chunk) => send("stdout", chunk),
				onStderr: (chunk) => send("stderr", chunk)
			})
		);
		send("done", String(code ?? -1));
	} catch (err) {
		send("error", err instanceof Error ? err.message : "Unknown error");
	} finally {
		ws.close();
	}
}
