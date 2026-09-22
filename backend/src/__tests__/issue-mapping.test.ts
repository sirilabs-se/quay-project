import { describe, expect, it } from "vitest";
import { mapIssue } from "../services/github/issue.service.js";

describe("mapIssue", () => {
	it("maps an open issue with an assignee and labels", () => {
		const result = mapIssue({
			number: 142,
			title: "Dispatch storms downstream services during outages",
			state: "OPEN",
			author: { login: "d2vk" },
			assignees: [{ login: "d2vk" }],
			labels: [{ name: "bug", color: "e5636b" }],
			updatedAt: "2026-09-22T09:00:00Z"
		});
		expect(result).toEqual({
			number: 142,
			title: "Dispatch storms downstream services during outages",
			state: "open",
			author: "d2vk",
			assignee: "d2vk",
			labels: [{ name: "bug", color: "e5636b" }],
			updatedAt: "2026-09-22T09:00:00Z"
		});
	});

	it("maps a closed, unassigned issue with no labels", () => {
		const result = mapIssue({
			number: 97,
			title: "Document dispatch retry configuration",
			state: "CLOSED",
			author: null,
			assignees: null,
			labels: null,
			updatedAt: "2026-09-10T09:00:00Z"
		});
		expect(result.state).toBe("closed");
		expect(result.author).toBe("unknown");
		expect(result.assignee).toBeNull();
		expect(result.labels).toEqual([]);
	});
});
