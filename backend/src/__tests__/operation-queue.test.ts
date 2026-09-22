import { describe, expect, it } from "vitest";
import { RepositoryOperationQueue } from "../services/git/operation-queue.js";

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("RepositoryOperationQueue", () => {
	it("serializes operations against the same repo", async () => {
		const queue = new RepositoryOperationQueue();
		const order: number[] = [];

		const first = queue.run("repo-a", async () => {
			await delay(20);
			order.push(1);
		});
		const second = queue.run("repo-a", async () => {
			order.push(2);
		});

		await Promise.all([first, second]);
		expect(order).toEqual([1, 2]);
	});

	it("does not block operations against a different repo", async () => {
		const queue = new RepositoryOperationQueue();
		const order: string[] = [];

		const slow = queue.run("repo-a", async () => {
			await delay(30);
			order.push("a");
		});
		const fast = queue.run("repo-b", async () => {
			order.push("b");
		});

		await Promise.all([slow, fast]);
		expect(order).toEqual(["b", "a"]);
	});

	it("continues processing the queue after an operation throws", async () => {
		const queue = new RepositoryOperationQueue();
		const failing = queue.run("repo-a", async () => {
			throw new Error("boom");
		});
		await expect(failing).rejects.toThrow("boom");

		const result = await queue.run("repo-a", async () => "ok");
		expect(result).toBe("ok");
	});
});
