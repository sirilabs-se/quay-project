import type { IncomingMessage, ServerResponse } from "node:http";
import { browseDirectory } from "../services/filesystem/browse.service.js";
import { sendJson } from "./respond.js";

export async function handleBrowseDirectory(req: IncomingMessage, res: ServerResponse): Promise<void> {
	try {
		const query = new URL(req.url ?? "/", "http://internal").searchParams;
		const result = await browseDirectory(query.get("path") ?? undefined);
		sendJson(res, 200, result);
	} catch (err) {
		sendJson(res, 400, { error: "bad_request", message: err instanceof Error ? err.message : "Failed to browse directory" });
	}
}
