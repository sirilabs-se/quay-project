/**
 * One git process per repository at a time — concurrent requests against the
 * same repo queue rather than race (ARCHITECTURE.md §6).
 */
export class RepositoryOperationQueue {
	private readonly tails = new Map<string, Promise<unknown>>();

	async run<T>(repoId: string, operation: () => Promise<T>): Promise<T> {
		const previous = this.tails.get(repoId) ?? Promise.resolve();
		const run = previous.then(operation, operation);
		this.tails.set(
			repoId,
			run.catch(() => undefined)
		);
		return run;
	}
}
