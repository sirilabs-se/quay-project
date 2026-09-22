import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_TOKEN_WINDOW_KEY } from "shared";
import { apiFetch, ApiError, readTokenFrom } from "../client";

describe("readTokenFrom", () => {
	it("reads the injected token from a window-like object", () => {
		const fakeWindow = { [SESSION_TOKEN_WINDOW_KEY]: "abc123" };
		expect(readTokenFrom(fakeWindow)).toBe("abc123");
	});

	it("returns null when the token is missing, the wrong type, or the source is undefined", () => {
		expect(readTokenFrom({})).toBeNull();
		expect(readTokenFrom({ [SESSION_TOKEN_WINDOW_KEY]: 42 })).toBeNull();
		expect(readTokenFrom(undefined)).toBeNull();
	});
});

describe("apiFetch", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("parses a successful JSON response", async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
		vi.stubGlobal("fetch", mockFetch);

		const result = await apiFetch<{ ok: boolean }>("/api/detection");
		expect(result).toEqual({ ok: true });
		expect(mockFetch).toHaveBeenCalledWith("/api/detection", expect.anything());
	});

	it("throws ApiError on a non-ok response", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
		await expect(apiFetch("/api/detection")).rejects.toThrow(ApiError);
	});
});
