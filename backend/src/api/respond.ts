import type { IncomingMessage, ServerResponse } from "node:http";

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(payload);
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(chunk as Buffer);
	}
	const raw = Buffer.concat(chunks).toString("utf-8");
	return raw.length > 0 ? (JSON.parse(raw) as T) : ({} as T);
}
