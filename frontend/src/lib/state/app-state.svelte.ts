import type {
	Branch,
	CommitDetail,
	CommitSummary,
	DetectionResponse,
	FileDiff,
	GitHubAccount,
	Remote,
	Repository,
	RepositoryAccountInfo,
	RepositoryStatus,
	Settings,
	Stash,
	Tag
} from "shared";
import * as api from "$lib/api/repositories";
import { ApiError, apiFetch } from "$lib/api/client";
import * as githubApi from "$lib/api/github";
import { connectEvents, connectRepositoryAction } from "$lib/api/ws";

export type ViewName =
	| "overview"
	| "changes"
	| "branches"
	| "history"
	| "stashes"
	| "tags"
	| "remotes"
	| "prs"
	| "issues"
	| "actions"
	| "releases"
	| "settings";

export type DiffMode = "unified" | "split";

export interface ToastMessage {
	id: number;
	text: string;
	kind: "success" | "info" | "error";
}

export interface ConsoleLine {
	kind: "cmd" | "out" | "err";
	text: string;
}

export interface FormField {
	key: string;
	label: string;
	type: "text" | "textarea" | "select" | "checkbox";
	value: string | boolean;
	options?: string[];
}

export interface FormModalState {
	title: string;
	fields: FormField[];
	submitLabel: string;
	onSubmit: (values: Record<string, string | boolean>) => void | Promise<void>;
}

export interface ConfirmModalState {
	title: string;
	body: string;
	onConfirm: () => void | Promise<void>;
}

export interface FlatFileEntry {
	path: string;
	flag: string;
	group: "Staged" | "Modified" | "Untracked";
}

let toastId = 0;

class QuayState {
	repositories = $state<Repository[]>([]);
	activeRepoId = $state<string | null>(null);
	activeView = $state<ViewName>("overview");
	sidebarCollapsed = $state(false);

	status = $state<RepositoryStatus | null>(null);
	selectedFileIdx = $state(0);
	diffMode = $state<DiffMode>("unified");
	currentDiff = $state<FileDiff | null>(null);
	diffLoading = $state(false);

	branches = $state<Branch[]>([]);
	history = $state<CommitSummary[]>([]);
	selectedCommitSha = $state<string | null>(null);
	selectedCommitDetail = $state<CommitDetail | null>(null);

	stashes = $state<Stash[]>([]);
	tags = $state<Tag[]>([]);
	remotes = $state<Remote[]>([]);

	detection = $state<DetectionResponse | null>(null);
	settings = $state<Settings | null>(null);

	accounts = $state<GitHubAccount[]>([]);
	activeAccount = $state<GitHubAccount | null>(null);
	repositoryAccountInfo = $state<RepositoryAccountInfo | null>(null);
	accountModalOpen = $state(false);
	pendingAccountSelection = $state<{ host: string; login: string } | null>(null);

	toasts = $state<ToastMessage[]>([]);
	consoleLines = $state<ConsoleLine[]>([]);
	consoleExpanded = $state(false);

	paletteOpen = $state(false);
	formModal = $state<FormModalState | null>(null);
	confirmModal = $state<ConfirmModalState | null>(null);

	loadingRepositories = $state(false);
	loadError = $state<string | null>(null);

	get activeRepo(): Repository | null {
		return this.repositories.find((r) => r.id === this.activeRepoId) ?? null;
	}

	get flatFiles(): FlatFileEntry[] {
		if (!this.status) return [];
		return [
			...this.status.staged.map((f) => ({ path: f.path, flag: f.flag, group: "Staged" as const })),
			...this.status.modified.map((f) => ({ path: f.path, flag: f.flag, group: "Modified" as const })),
			...this.status.untracked.map((f) => ({ path: f.path, flag: f.flag, group: "Untracked" as const }))
		];
	}

	toast(text: string, kind: ToastMessage["kind"] = "info"): void {
		const id = ++toastId;
		this.toasts.push({ id, text, kind });
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, 3200);
	}

	consoleLog(cmd: string, lines: string[] = [], isErr = false): void {
		this.consoleLines.push({ kind: "cmd", text: cmd });
		for (const line of lines) {
			this.consoleLines.push({ kind: isErr ? "err" : "out", text: line });
		}
	}

	async init(): Promise<void> {
		await Promise.all([this.loadDetection(), this.loadSettings(), this.loadAccounts(), this.loadRepositories()]);
		connectEvents((repoId) => {
			if (repoId === this.activeRepoId) {
				void this.refreshActiveView();
			}
		});
	}

	async loadAccounts(): Promise<void> {
		const { accounts, active } = await githubApi.listAccounts();
		this.accounts = accounts;
		this.activeAccount = active;
	}

	async loadRepositoryAccountInfo(): Promise<void> {
		if (!this.activeRepoId) {
			this.repositoryAccountInfo = null;
			return;
		}
		this.repositoryAccountInfo = await githubApi.getRepositoryAccountInfo(this.activeRepoId);
	}

	openAccountModal(preselect?: { host: string; login: string }): void {
		this.pendingAccountSelection = preselect ?? (this.activeAccount ? { host: this.activeAccount.host, login: this.activeAccount.login } : null);
		this.accountModalOpen = true;
	}

	closeAccountModal(): void {
		this.accountModalOpen = false;
	}

	async confirmAccountSwitch(): Promise<void> {
		if (!this.pendingAccountSelection) return;
		const { host, login } = this.pendingAccountSelection;
		this.activeAccount = await githubApi.switchAccount(host, login);
		this.accountModalOpen = false;
		this.toast(`Active account: ${this.activeAccount.login} · ${this.activeAccount.host}`, "success");
		await this.loadRepositoryAccountInfo();
	}

	async loadDetection(): Promise<void> {
		this.detection = await apiFetch("/api/detection");
	}

	async loadSettings(): Promise<void> {
		this.settings = await apiFetch("/api/settings");
	}

	async saveSettings(patch: Partial<Settings>): Promise<void> {
		this.settings = await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(patch) });
	}

	async loadRepositories(): Promise<void> {
		this.loadingRepositories = true;
		this.loadError = null;
		try {
			this.repositories = await api.listRepositories();
			if (!this.activeRepoId && this.repositories.length > 0) {
				await this.selectRepo(this.repositories[0].id);
			}
		} catch (err) {
			this.loadError = err instanceof Error ? err.message : "Failed to load repositories";
		} finally {
			this.loadingRepositories = false;
		}
	}

	async addRepository(path: string): Promise<void> {
		const repo = await api.addRepository(path);
		this.repositories = [...this.repositories, repo].sort((a, b) => a.name.localeCompare(b.name));
		this.toast(`Added ${repo.name}`, "success");
		await this.selectRepo(repo.id);
	}

	async selectRepo(id: string): Promise<void> {
		if (id === this.activeRepoId) return;
		this.activeRepoId = id;
		this.selectedFileIdx = 0;
		this.currentDiff = null;
		await Promise.all([this.refreshActiveView(), this.loadRepositoryAccountInfo()]);
	}

	async setActiveView(view: ViewName): Promise<void> {
		this.activeView = view;
		await this.refreshActiveView();
	}

	async refreshActiveView(): Promise<void> {
		if (!this.activeRepoId) return;
		const id = this.activeRepoId;
		switch (this.activeView) {
			case "overview":
			case "changes":
				await this.refreshStatus(id);
				if (this.activeView === "changes") await this.refreshDiff();
				break;
			case "branches":
				await this.refreshBranches(id);
				break;
			case "history":
				await this.refreshHistory(id);
				break;
			case "stashes":
				await this.refreshStashes(id);
				break;
			case "tags":
				await this.refreshTags(id);
				break;
			case "remotes":
				await this.refreshRemotes(id);
				break;
			default:
				await this.refreshStatus(id);
		}
	}

	async refreshStatus(id: string = this.activeRepoId!): Promise<void> {
		if (!id) return;
		this.status = await api.getStatus(id);
	}

	async refreshBranches(id: string = this.activeRepoId!): Promise<void> {
		if (!id) return;
		this.branches = await api.getBranches(id);
	}

	async refreshHistory(id: string = this.activeRepoId!): Promise<void> {
		if (!id) return;
		this.history = await api.getHistory(id, 200);
		if (this.history.length > 0 && !this.selectedCommitSha) {
			await this.selectCommit(this.history[0].sha);
		} else if (this.selectedCommitSha) {
			await this.selectCommit(this.selectedCommitSha);
		}
	}

	async selectCommit(sha: string): Promise<void> {
		if (!this.activeRepoId) return;
		this.selectedCommitSha = sha;
		this.selectedCommitDetail = await api.getCommitDetail(this.activeRepoId, sha);
	}

	async refreshStashes(id: string = this.activeRepoId!): Promise<void> {
		if (!id) return;
		this.stashes = await api.getStashes(id);
	}

	async refreshTags(id: string = this.activeRepoId!): Promise<void> {
		if (!id) return;
		this.tags = await api.getTags(id);
	}

	async refreshRemotes(id: string = this.activeRepoId!): Promise<void> {
		if (!id) return;
		this.remotes = await api.getRemotes(id);
	}

	async selectFile(idx: number): Promise<void> {
		this.selectedFileIdx = idx;
		await this.refreshDiff();
	}

	async refreshDiff(): Promise<void> {
		const file = this.flatFiles[this.selectedFileIdx];
		if (!file || !this.activeRepoId) {
			this.currentDiff = null;
			return;
		}
		this.diffLoading = true;
		try {
			this.currentDiff = await api.getDiff(this.activeRepoId, file.path, file.group === "Staged");
		} finally {
			this.diffLoading = false;
		}
	}

	async toggleStaged(file: FlatFileEntry): Promise<void> {
		if (!this.activeRepoId) return;
		if (file.group === "Staged") {
			await api.unstageFiles(this.activeRepoId, [file.path]);
		} else {
			await api.stageFiles(this.activeRepoId, [file.path]);
		}
		await this.refreshStatus();
		await this.refreshDiff();
	}

	async discardFile(file: FlatFileEntry): Promise<void> {
		if (!this.activeRepoId) return;
		await api.discardFile(this.activeRepoId, file.path, file.group === "Untracked");
		this.selectedFileIdx = 0;
		this.toast(`Discarded changes to ${file.path.split("/").pop()}`, "success");
		await this.refreshStatus();
		await this.refreshDiff();
	}

	async commitChanges(message: string, amend: boolean, push: boolean): Promise<void> {
		if (!this.activeRepoId) return;
		const commit = await api.commit(this.activeRepoId, message, amend);
		this.consoleLog(amend ? `git commit --amend -m "${message}"` : `git commit -m "${message}"`, [
			commit ? `[${this.status?.branch ?? "HEAD"} ${commit.sha.slice(0, 7)}] ${commit.message}` : "Commit created"
		]);
		this.toast(amend ? "Amended previous commit" : "Committed changes", "success");
		if (push) {
			await this.pushCurrentBranch();
		}
		await this.refreshStatus();
		this.selectedFileIdx = 0;
		await this.refreshDiff();
	}

	async pushCurrentBranch(): Promise<void> {
		await this.runRemoteAction("push");
	}

	async runRemoteAction(action: "fetch" | "pull" | "push"): Promise<void> {
		if (!this.activeRepoId) return;
		this.consoleExpanded = true;
		await new Promise<void>((resolve) => {
			connectRepositoryAction(this.activeRepoId!, action, "origin", {
				onStdout: (chunk) => this.consoleLog(`git ${action}`, [chunk.trim()]),
				onStderr: (chunk) => this.consoleLog(`git ${action}`, [chunk.trim()], true),
				onDone: async (code) => {
					this.toast(code === 0 ? `${action} complete` : `${action} failed`, code === 0 ? "success" : "error");
					await this.refreshStatus();
					resolve();
				},
				onError: (message) => {
					this.toast(`${action} failed: ${message}`, "error");
					resolve();
				}
			});
		});
	}

	async createBranch(name: string, base: string, checkout: boolean): Promise<void> {
		if (!this.activeRepoId) return;
		await api.createBranch(this.activeRepoId, name, base, checkout);
		this.consoleLog(`git checkout -b ${name} ${base}`, checkout ? [`Switched to a new branch '${name}'`] : []);
		this.toast(`Created branch ${name}`, "success");
		await this.refreshBranches();
		await this.refreshStatus();
	}

	async checkoutBranch(name: string): Promise<void> {
		if (!this.activeRepoId) return;
		await api.checkoutBranch(this.activeRepoId, name);
		this.consoleLog(`git checkout ${name}`, [`Switched to branch '${name}'`]);
		this.toast(`Checked out ${name}`, "success");
		await this.refreshBranches();
		await this.refreshStatus();
	}

	async deleteBranch(name: string, force: boolean): Promise<void> {
		if (!this.activeRepoId) return;
		await api.deleteBranch(this.activeRepoId, name, force);
		this.consoleLog(`git branch ${force ? "-D" : "-d"} ${name}`, [`Deleted branch ${name}`]);
		this.toast(`Deleted ${name}`, "success");
		await this.refreshBranches();
	}

	async mergeBranch(name: string): Promise<{ conflicts: string[] }> {
		if (!this.activeRepoId) throw new Error("No active repository");
		try {
			const result = await api.mergeBranch(this.activeRepoId, name);
			this.consoleLog(`git merge --no-edit ${name}`, ["Merge made by the 'ort' strategy."]);
			this.toast(`Merged ${name} into ${this.status?.branch ?? "current branch"}`, "success");
			await this.refreshStatus();
			return result;
		} catch (err) {
			const conflicts = err instanceof ApiError && Array.isArray(err.body?.conflicts) ? (err.body!.conflicts as string[]) : null;
			if (conflicts) {
				this.consoleLog(`git merge --no-edit ${name}`, conflicts.map((c) => `CONFLICT (content): Merge conflict in ${c}`), true);
				this.toast(`Merge conflict — ${conflicts.length} file(s) need resolving`, "info");
				await this.refreshStatus();
				return { conflicts };
			}
			throw err;
		}
	}

	async abortMerge(): Promise<void> {
		if (!this.activeRepoId) return;
		await api.abortMerge(this.activeRepoId);
		this.consoleLog("git merge --abort", []);
		this.toast("Merge aborted", "success");
		await this.refreshStatus();
	}

	async saveStash(message: string): Promise<void> {
		if (!this.activeRepoId) return;
		await api.stashSave(this.activeRepoId, message || undefined);
		this.toast("Stashed changes", "success");
		await this.refreshStatus();
		await this.refreshStashes();
	}

	async applyStash(index: number): Promise<void> {
		if (!this.activeRepoId) return;
		await api.stashApply(this.activeRepoId, index);
		this.toast("Applied stash", "success");
		await this.refreshStatus();
	}

	async popStash(index: number): Promise<void> {
		if (!this.activeRepoId) return;
		await api.stashPop(this.activeRepoId, index);
		this.toast("Popped stash", "success");
		await this.refreshStatus();
		await this.refreshStashes();
	}

	async dropStash(index: number): Promise<void> {
		if (!this.activeRepoId) return;
		await api.stashDrop(this.activeRepoId, index);
		this.toast("Dropped stash", "success");
		await this.refreshStashes();
	}

	async createTag(name: string, ref: string): Promise<void> {
		if (!this.activeRepoId) return;
		await api.createTag(this.activeRepoId, name, ref);
		this.consoleLog(`git tag ${name} ${ref}`, []);
		this.toast(`Created tag ${name}`, "success");
		await this.refreshTags();
	}

	async addRemote(name: string, url: string): Promise<void> {
		if (!this.activeRepoId) return;
		await api.addRemote(this.activeRepoId, name, url);
		this.toast(`Added remote ${name}`, "success");
		await this.refreshRemotes();
	}

	openFormModal(state: FormModalState): void {
		this.formModal = state;
	}

	closeFormModal(): void {
		this.formModal = null;
	}

	openConfirm(title: string, body: string, onConfirm: () => void | Promise<void>): void {
		this.confirmModal = { title, body, onConfirm };
	}

	closeConfirm(): void {
		this.confirmModal = null;
	}

	toggleConsole(force?: boolean): void {
		this.consoleExpanded = force ?? !this.consoleExpanded;
	}

	toggleSidebar(): void {
		this.sidebarCollapsed = !this.sidebarCollapsed;
	}
}

export const quay = new QuayState();
