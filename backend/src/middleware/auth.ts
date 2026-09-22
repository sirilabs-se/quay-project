import type { IncomingMessage } from "node:http";
import { SESSION_TOKEN_HEADER } from "shared";

export interface AuthConfig {
	token: string;
	allowedHosts: string[];
	allowedOrigins: string[];
}

/**
 * Host header validation applies to every request, including static asset
 * serving — it's the one check present even before the browser has the
 * session token, and it's what actually defeats DNS rebinding (the Origin
 * header reflects the page's real origin, but so does Host, and Host is
 * present on the very first navigation request too).
 */
export function isHostAllowed(req: IncomingMessage, config: AuthConfig): boolean {
	const host = req.headers.host;
	return typeof host === "string" && config.allowedHosts.includes(host);
}

export function isApiRequestAuthorized(req: IncomingMessage, config: AuthConfig): boolean {
	if (!isHostAllowed(req, config)) return false;

	const origin = req.headers.origin;
	if (typeof origin !== "string" || !config.allowedOrigins.includes(origin)) {
		return false;
	}

	const token = req.headers[SESSION_TOKEN_HEADER];
	return token === config.token;
}
