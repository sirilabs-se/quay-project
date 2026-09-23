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

/**
 * Browsers only attach `Origin` when it's actually needed to prove cross-
 * origin-ness — it's mandatory (and unspoofable by page JS) on every
 * cross-origin request, but commonly omitted on a simple same-origin GET
 * fetch. So the check has to be "if present, it must match" rather than
 * "must be present and match": requiring it unconditionally would reject
 * legitimate same-origin GETs while providing no extra defense, since an
 * attacker's cross-origin request can't omit Origin in the first place —
 * Host validation (always present) is what actually carries the weight
 * against a forged/cross-origin request here.
 */
function isOriginAllowed(req: IncomingMessage, config: AuthConfig): boolean {
	const origin = req.headers.origin;
	if (typeof origin !== "string") return true;
	return config.allowedOrigins.includes(origin);
}

export function isApiRequestAuthorized(req: IncomingMessage, config: AuthConfig): boolean {
	if (!isHostAllowed(req, config)) return false;
	if (!isOriginAllowed(req, config)) return false;

	const token = req.headers[SESSION_TOKEN_HEADER];
	return token === config.token;
}
