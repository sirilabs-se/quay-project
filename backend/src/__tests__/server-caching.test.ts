import { describe, expect, it } from "vitest";
import { cacheControlFor } from "../server.js";

describe("cacheControlFor", () => {
	it("never caches index.html — it carries a per-launch session token", () => {
		expect(cacheControlFor("/", ".html")).toBe("no-store");
		expect(cacheControlFor("/some/deep/route", ".html")).toBe("no-store");
	});

	it("applies no-store to the SPA fallback too (missing file served as index.html under the original pathname)", () => {
		// serveStatic falls back to index.html's contents when the requested
		// file doesn't exist, but keeps the original request pathname — the
		// served extension (.html) must still win over the pathname shape.
		expect(cacheControlFor("/_app/immutable/entry/app.abc123.js", ".html")).toBe("no-store");
	});

	it("aggressively caches hashed /immutable/ assets", () => {
		expect(cacheControlFor("/_app/immutable/entry/app.abc123.js", ".js")).toBe("public, max-age=31536000, immutable");
		expect(cacheControlFor("/_app/immutable/assets/0.def456.css", ".css")).toBe("public, max-age=31536000, immutable");
	});

	it("falls back to no-cache for other static assets (e.g. favicon)", () => {
		expect(cacheControlFor("/favicon.svg", ".svg")).toBe("no-cache");
	});
});
