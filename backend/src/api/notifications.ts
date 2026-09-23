import type { IncomingMessage, ServerResponse } from "node:http";
import { githubAccountService, notificationsService } from "./context.js";
import { sendJson } from "./respond.js";

export async function handleListNotifications(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const account = await githubAccountService.getActiveAccount();
	if (!account) {
		sendJson(res, 200, []);
		return;
	}
	try {
		const notifications = await notificationsService.list(account);
		sendJson(res, 200, notifications);
	} catch (err) {
		console.error(err);
		sendJson(res, 502, { error: "github_error", message: err instanceof Error ? err.message : "GitHub operation failed" });
	}
}

export async function handleMarkNotificationsRead(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const account = await githubAccountService.getActiveAccount();
	if (!account) {
		sendJson(res, 200, { ok: true });
		return;
	}
	try {
		await notificationsService.markAllRead(account);
		sendJson(res, 200, { ok: true });
	} catch (err) {
		console.error(err);
		sendJson(res, 502, { error: "github_error", message: err instanceof Error ? err.message : "GitHub operation failed" });
	}
}

export async function handleMarkNotificationRead(
	_req: IncomingMessage,
	res: ServerResponse,
	params: Record<string, string>
): Promise<void> {
	const account = await githubAccountService.getActiveAccount();
	if (!account) {
		sendJson(res, 200, { ok: true });
		return;
	}
	try {
		await notificationsService.markRead(account, params.id);
		sendJson(res, 200, { ok: true });
	} catch (err) {
		console.error(err);
		sendJson(res, 502, { error: "github_error", message: err instanceof Error ? err.message : "GitHub operation failed" });
	}
}
