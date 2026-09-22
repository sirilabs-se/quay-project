import type { IncomingMessage, ServerResponse } from "node:http";
import { handleDetection } from "./detection.js";
import { handleGetSettings, handlePutSettings } from "./settings.js";

type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

interface Route {
	method: string;
	pattern: RegExp;
	handler: ApiHandler;
}

const routes: Route[] = [
	{ method: "GET", pattern: /^\/api\/detection$/, handler: handleDetection },
	{ method: "GET", pattern: /^\/api\/settings$/, handler: handleGetSettings },
	{ method: "PUT", pattern: /^\/api\/settings$/, handler: handlePutSettings }
];

/** Returns true if a route matched (and handled the response), false otherwise. */
export async function routeApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
	const url = new URL(req.url ?? "/", "http://internal");
	for (const route of routes) {
		if (route.method === req.method && route.pattern.test(url.pathname)) {
			await route.handler(req, res);
			return true;
		}
	}
	return false;
}
