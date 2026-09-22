import { watch, type FSWatcher } from "chokidar";

const DEBOUNCE_MS = 400;

/**
 * Watches each registered repository's working tree and .git dir so changes
 * made outside Quay (another terminal, an editor's git integration) trigger
 * a status refresh instead of going unnoticed until the next manual action.
 * ARCHITECTURE.md §6 — file watching over polling.
 */
export class RepoWatcher {
	private readonly watchers = new Map<string, FSWatcher>();
	private readonly timers = new Map<string, NodeJS.Timeout>();

	constructor(private readonly onChange: (repoId: string) => void) {}

	watchRepo(repoId: string, repoPath: string): void {
		if (this.watchers.has(repoId)) return;
		const watcher = watch(repoPath, {
			ignoreInitial: true,
			ignored: (path) => /(^|\/)node_modules(\/|$)/.test(path),
			depth: 20
		});
		watcher.on("all", () => this.debouncedNotify(repoId));
		this.watchers.set(repoId, watcher);
	}

	async unwatchRepo(repoId: string): Promise<void> {
		const watcher = this.watchers.get(repoId);
		if (watcher) {
			await watcher.close();
			this.watchers.delete(repoId);
		}
		const timer = this.timers.get(repoId);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(repoId);
		}
	}

	private debouncedNotify(repoId: string): void {
		const existing = this.timers.get(repoId);
		if (existing) clearTimeout(existing);
		this.timers.set(
			repoId,
			setTimeout(() => {
				this.timers.delete(repoId);
				this.onChange(repoId);
			}, DEBOUNCE_MS)
		);
	}
}
