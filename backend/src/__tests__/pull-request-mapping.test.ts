import { describe, expect, it } from "vitest";
import { mapCheckStatus, mapDetail, mapSummary, type GhPrJson } from "../services/github/pull-request.service.js";

const BASE: GhPrJson = {
	number: 214,
	title: "Add exponential backoff to dispatch retry",
	state: "OPEN",
	isDraft: false,
	author: { login: "d2vk" },
	baseRefName: "main",
	headRefName: "feature/dispatch-retry",
	labels: [{ name: "enhancement", color: "e2851e" }],
	updatedAt: "2026-09-22T10:00:00Z",
	statusCheckRollup: []
};

describe("mapCheckStatus", () => {
	it("returns 'none' for an empty or missing rollup", () => {
		expect(mapCheckStatus([])).toBe("none");
		expect(mapCheckStatus(undefined)).toBe("none");
		expect(mapCheckStatus(null)).toBe("none");
	});

	it("returns 'pass' when every check succeeded", () => {
		expect(mapCheckStatus([{ conclusion: "SUCCESS" }, { conclusion: "SUCCESS" }])).toBe("pass");
	});

	it("returns 'fail' when any check failed", () => {
		expect(mapCheckStatus([{ conclusion: "SUCCESS" }, { conclusion: "FAILURE" }])).toBe("fail");
	});

	it("returns 'pending' when a check is still running", () => {
		expect(mapCheckStatus([{ status: "IN_PROGRESS" }])).toBe("pending");
	});

	it("prioritizes failure over pending", () => {
		expect(mapCheckStatus([{ status: "IN_PROGRESS" }, { conclusion: "FAILURE" }])).toBe("fail");
	});

	it("handles StatusContext-shaped entries (state instead of conclusion)", () => {
		expect(mapCheckStatus([{ state: "SUCCESS" }])).toBe("pass");
		expect(mapCheckStatus([{ state: "ERROR" }])).toBe("fail");
		expect(mapCheckStatus([{ state: "PENDING" }])).toBe("pending");
	});
});

describe("mapSummary", () => {
	it("maps an open PR", () => {
		const result = mapSummary(BASE);
		expect(result).toEqual({
			number: 214,
			title: "Add exponential backoff to dispatch retry",
			state: "open",
			draft: false,
			author: "d2vk",
			baseRefName: "main",
			headRefName: "feature/dispatch-retry",
			labels: [{ name: "enhancement", color: "e2851e" }],
			updatedAt: "2026-09-22T10:00:00Z",
			checkStatus: "none"
		});
	});

	it("maps merged and closed states", () => {
		expect(mapSummary({ ...BASE, state: "MERGED" }).state).toBe("merged");
		expect(mapSummary({ ...BASE, state: "CLOSED" }).state).toBe("closed");
	});

	it("falls back to 'unknown' author and empty labels when missing", () => {
		const result = mapSummary({ ...BASE, author: null, labels: null });
		expect(result.author).toBe("unknown");
		expect(result.labels).toEqual([]);
	});
});

describe("mapDetail", () => {
	it("maps commits and files, defaulting missing fields", () => {
		const result = mapDetail({
			...BASE,
			body: "Fixes the retry storm.",
			reviewDecision: "APPROVED",
			commits: [{ oid: "abc123", messageHeadline: "Add backoff" }],
			files: [{ path: "src/Foo.java", additions: 10, deletions: 2 }]
		});
		expect(result.body).toBe("Fixes the retry storm.");
		expect(result.reviewDecision).toBe("APPROVED");
		expect(result.commits).toEqual([{ sha: "abc123", message: "Add backoff" }]);
		expect(result.files).toEqual([{ path: "src/Foo.java", additions: 10, deletions: 2 }]);
	});

	it("defaults body/commits/files/reviewDecision when absent", () => {
		const result = mapDetail(BASE);
		expect(result.body).toBe("");
		expect(result.reviewDecision).toBeNull();
		expect(result.commits).toEqual([]);
		expect(result.files).toEqual([]);
	});
});
