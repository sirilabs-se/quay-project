import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { isHostAllowed, type AuthConfig } from "../middleware/auth.js";

const wss = new WebSocketServer({ noServer: true });
const clients = new Set<WebSocket>();

export function handleEventsUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, config: AuthConfig): boolean {
	const url = new URL(req.url ?? "/", "http://internal");
	if (url.pathname !== "/ws/events") return false;

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

	wss.handleUpgrade(req, socket, head, (ws) => {
		clients.add(ws);
		ws.on("close", () => clients.delete(ws));
	});
	return true;
}

/** Broadcasts a repo-changed notification to every connected client, prompting a status refresh. */
export function broadcastRepoChanged(repoId: string): void {
	const payload = JSON.stringify({ type: "repo-changed", repoId });
	for (const ws of clients) {
		if (ws.readyState === ws.OPEN) ws.send(payload);
	}
}
