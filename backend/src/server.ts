import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SESSION_TOKEN_WINDOW_KEY } from "shared";
import { routeApiRequest } from "./api/router.js";
import { sendJson } from "./api/respond.js";
import { isApiRequestAuthorized, isHostAllowed, type AuthConfig } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_BUILD_DIR = path.resolve(__dirname, "../../frontend/build");

const CONTENT_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2"
};

export function createQuayServer(config: AuthConfig): Server {
	return createServer((req, res) => {
		handleRequest(req, res, config).catch((err: unknown) => {
			console.error("Unhandled request error:", err);
			if (!res.headersSent) {
				sendJson(res, 500, { error: "internal_error" });
			}
		});
	});
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, config: AuthConfig): Promise<void> {
	// Host validation applies to every request — it's the check that holds even
	// before the browser has a session token (static asset requests) and is
	// what actually defeats DNS rebinding.
	if (!isHostAllowed(req, config)) {
		sendJson(res, 421, { error: "host_not_allowed" });
		return;
	}

	const url = new URL(req.url ?? "/", "http://internal");

	if (url.pathname.startsWith("/api/")) {
		if (!isApiRequestAuthorized(req, config)) {
			sendJson(res, 401, { error: "unauthorized" });
			return;
		}
		const handled = await routeApiRequest(req, res);
		if (!handled) {
			sendJson(res, 404, { error: "not_found" });
		}
		return;
	}

	await serveStatic(url.pathname, res, config.token);
}

async function serveStatic(pathname: string, res: ServerResponse, token: string): Promise<void> {
	const relative = pathname === "/" ? "/index.html" : pathname;
	const requested = path.normalize(path.join(FRONTEND_BUILD_DIR, relative));

	if (!requested.startsWith(FRONTEND_BUILD_DIR)) {
		sendJson(res, 400, { error: "bad_request" });
		return;
	}

	let target = requested;
	try {
		const stats = await stat(target);
		if (stats.isDirectory()) {
			target = path.join(target, "index.html");
		}
	} catch {
		target = path.join(FRONTEND_BUILD_DIR, "index.html");
	}

	try {
		const ext = path.extname(target);
		const raw = await readFile(target);
		const contents = ext === ".html" ? injectSessionToken(raw, token) : raw;
		res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
		res.end(contents);
	} catch {
		sendJson(res, 404, { error: "not_found" });
	}
}

function injectSessionToken(html: Buffer, token: string): Buffer {
	const script = `<script>window.${SESSION_TOKEN_WINDOW_KEY} = ${JSON.stringify(token)};</script>`;
	const withToken = html.toString("utf-8").replace("</head>", `${script}</head>`);
	return Buffer.from(withToken, "utf-8");
}
