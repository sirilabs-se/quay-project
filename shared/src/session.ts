/** Header carrying the per-launch session token on every HTTP/WS request. */
export const SESSION_TOKEN_HEADER = "x-quay-session-token";

/** Global injected into the served index.html so the SPA can read its token. */
export const SESSION_TOKEN_WINDOW_KEY = "__QUAY_SESSION_TOKEN__";
