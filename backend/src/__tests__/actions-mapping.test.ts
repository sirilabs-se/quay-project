import { describe, expect, it } from "vitest";
import { mapRunStatus } from "../services/github/actions.service.js";

describe("mapRunStatus", () => {
	it("maps a completed successful run to pass", () => {
		expect(mapRunStatus("completed", "success")).toBe("pass");
	});

	it("maps a completed non-successful run to fail", () => {
		expect(mapRunStatus("completed", "failure")).toBe("fail");
		expect(mapRunStatus("completed", "cancelled")).toBe("fail");
	});

	it("maps any non-completed status to running", () => {
		expect(mapRunStatus("in_progress", null)).toBe("running");
		expect(mapRunStatus("queued", null)).toBe("running");
	});
});
