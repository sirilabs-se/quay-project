import { getSessionToken } from "./client";

function wsUrl(pathname: string, params: Record<string, string>): string {
	const url = new URL(pathname, window.location.href);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url.toString();
}

export interface RemoteActionHandlers {
	onStdout?: (chunk: string) => void;
	onStderr?: (chunk: string) => void;
	onDone?: (code: number) => void;
	onError?: (message: string) => void;
}

/**
 * Streams `git fetch`/`pull`/`push` output over WS. Browsers can't set a
 * custom header on a WS handshake, so the session token travels as a query
 * parameter here instead of the x-quay-session-token header used elsewhere.
 */
export function connectRepositoryAction(
	repoId: string,
	action: "fetch" | "pull" | "push",
	remote: string,
	handlers: RemoteActionHandlers
): WebSocket {
	const token = getSessionToken() ?? "";
	const ws = new WebSocket(wsUrl(`/ws/repositories/${repoId}/${action}`, { token, remote }));
	ws.addEventListener("message", (event) => {
		const msg = JSON.parse(event.data as string) as { type: string; data: string };
		if (msg.type === "stdout") handlers.onStdout?.(msg.data);
		else if (msg.type === "stderr") handlers.onStderr?.(msg.data);
		else if (msg.type === "done") handlers.onDone?.(Number(msg.data));
		else if (msg.type === "error") handlers.onError?.(msg.data);
	});
	return ws;
}

export function connectEvents(onRepoChanged: (repoId: string) => void): WebSocket {
	const token = getSessionToken() ?? "";
	const ws = new WebSocket(wsUrl("/ws/events", { token }));
	ws.addEventListener("message", (event) => {
		const msg = JSON.parse(event.data as string) as { type: string; repoId: string };
		if (msg.type === "repo-changed") onRepoChanged(msg.repoId);
	});
	return ws;
}
