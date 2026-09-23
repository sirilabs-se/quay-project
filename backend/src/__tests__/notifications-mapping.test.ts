import { describe, expect, it } from "vitest";
import { mapNotification, webUrlAndNumber } from "../services/github/notifications.service.js";

describe("webUrlAndNumber", () => {
	it("converts a pull request API URL to a web URL and extracts the number", () => {
		const result = webUrlAndNumber("https://api.github.com/repos/vikunalabs/commander/pulls/214");
		expect(result.url).toBe("https://github.com/vikunalabs/commander/pull/214");
		expect(result.number).toBe(214);
	});

	it("converts an issue API URL to a web URL and extracts the number", () => {
		const result = webUrlAndNumber("https://api.github.com/repos/vikunalabs/commander/issues/142");
		expect(result.url).toBe("https://github.com/vikunalabs/commander/issues/142");
		expect(result.number).toBe(142);
	});

	it("returns nulls for a null subject URL", () => {
		expect(webUrlAndNumber(null)).toEqual({ url: null, number: null });
	});

	it("returns nulls for a subject type it doesn't recognize (e.g. a Discussion or CheckSuite URL)", () => {
		expect(webUrlAndNumber("https://api.github.com/repos/vikunalabs/commander/discussions/5")).toEqual({ url: null, number: null });
	});
});

describe("mapNotification", () => {
	it("maps a pull-request notification with a resolved web URL and number", () => {
		const result = mapNotification({
			id: "12345",
			unread: true,
			reason: "review_requested",
			subject: { title: "Add exponential backoff", type: "PullRequest", url: "https://api.github.com/repos/vikunalabs/commander/pulls/214" },
			repository: { full_name: "vikunalabs/commander" },
			updated_at: "2026-09-22T10:00:00Z"
		});
		expect(result).toEqual({
			id: "12345",
			unread: true,
			reason: "review_requested",
			title: "Add exponential backoff",
			type: "PullRequest",
			repo: "vikunalabs/commander",
			updatedAt: "2026-09-22T10:00:00Z",
			url: "https://github.com/vikunalabs/commander/pull/214",
			number: 214
		});
	});
});
