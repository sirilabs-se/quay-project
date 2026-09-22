import type { IncomingMessage, ServerResponse } from "node:http";
import { detectBinaries } from "../services/detection/detection.service.js";
import { sendJson } from "./respond.js";

export async function handleDetection(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const result = await detectBinaries();
	sendJson(res, 200, result);
}
