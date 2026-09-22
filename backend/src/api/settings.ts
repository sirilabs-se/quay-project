import type { IncomingMessage, ServerResponse } from "node:http";
import type { Settings } from "shared";
import { ConfigService } from "../services/config/config.service.js";
import { readJsonBody, sendJson } from "./respond.js";

const configService = new ConfigService();

export async function handleGetSettings(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const settings = await configService.read();
	sendJson(res, 200, settings);
}

export async function handlePutSettings(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const body = await readJsonBody<Partial<Settings>>(req);
	const current = await configService.read();
	const next: Settings = { ...current, ...body };
	await configService.write(next);
	sendJson(res, 200, next);
}
