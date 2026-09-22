import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { isApiRequestAuthorized, isHostAllowed, type AuthConfig } from "../middleware/auth.js";

const config: AuthConfig = {
	token: "secret-token",
	allowedHosts: ["127.0.0.1:4317", "localhost:4317"],
	allowedOrigins: ["http://127.0.0.1:4317", "http://localhost:4317"]
};

function req(headers: Record<string, string>): IncomingMessage {
	return { headers } as unknown as IncomingMessage;
}

describe("isHostAllowed", () => {
	it("accepts an allowed host", () => {
		expect(isHostAllowed(req({ host: "127.0.0.1:4317" }), config)).toBe(true);
	});

	it("rejects a mismatched host (DNS rebinding case)", () => {
		expect(isHostAllowed(req({ host: "evil.com:4317" }), config)).toBe(false);
	});

	it("rejects a missing host header", () => {
		expect(isHostAllowed(req({}), config)).toBe(false);
	});
});

describe("isApiRequestAuthorized", () => {
	it("accepts a request with matching host, origin, and token", () => {
		const request = req({
			host: "127.0.0.1:4317",
			origin: "http://127.0.0.1:4317",
			"x-quay-session-token": "secret-token"
		});
		expect(isApiRequestAuthorized(request, config)).toBe(true);
	});

	it("rejects a wrong token", () => {
		const request = req({
			host: "127.0.0.1:4317",
			origin: "http://127.0.0.1:4317",
			"x-quay-session-token": "wrong-token"
		});
		expect(isApiRequestAuthorized(request, config)).toBe(false);
	});

	it("rejects a missing token", () => {
		const request = req({ host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317" });
		expect(isApiRequestAuthorized(request, config)).toBe(false);
	});

	it("rejects a disallowed origin even with the correct token", () => {
		const request = req({
			host: "127.0.0.1:4317",
			origin: "http://evil.com",
			"x-quay-session-token": "secret-token"
		});
		expect(isApiRequestAuthorized(request, config)).toBe(false);
	});

	it("rejects a disallowed host even with the correct token and origin", () => {
		const request = req({
			host: "evil.com:4317",
			origin: "http://127.0.0.1:4317",
			"x-quay-session-token": "secret-token"
		});
		expect(isApiRequestAuthorized(request, config)).toBe(false);
	});
});
