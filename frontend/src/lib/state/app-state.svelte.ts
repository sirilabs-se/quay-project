import type {
	Branch,
	CommitDetail,
	CommitSummary,
	DetectionResponse,
	FileDiff,
	BrowseResult,
	GitHubAccount,
	GitHubNotification,
	IssueSummary,
	Label,
	PullRequestDetail,
	PullRequestSummary,
	Release,
	RemoteRepository,
	Remote,
	Repository,
	RepositoryAccountInfo,
	RepositoryStatus,
	Settings,
	Stash,
	Tag,
	WorkflowRun
} from "shared";
import * as api from "$lib/api/repositories";
import { ApiError, apiFetch } from "$lib/api/client";
import * as githubApi from "$lib/api/github";
import * as prApi from "$lib/api/pull-requests";
import type { PullRequestStateFilter } from "$lib/api/pull-requests";
import * as issueApi from "$lib/api/issues";
import type { IssueStateFilter } from "$lib/api/issues";
import * as actionsApi from "$lib/api/actions";
import * as filesystemApi from "$lib/api/filesystem";
import { connectClone, connectEvents, connectRepositoryAction } from "$lib/api/ws";

export type ViewName =
	| "overview"
	| "changes"
	| "branches"
	| "history"
	| "stashes"
	| "tags"
	| "remotes"
	| "prs"
	| "pr-detail"
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
	remoteRepos = $state<RemoteRepository[]>([]);
	accountModalOpen = $state(false);
	pendingAccountSelection = $state<{ host: string; login: string } | null>(null);

	pullRequests = $state<PullRequestSummary[]>([]);
	prFilter = $state<PullRequestStateFilter>("open");
	prLoadError = $state<string | null>(null);
	selectedPr = $state<PullRequestDetail | null>(null);
	prDetailTab = $state<"conversation" | "commits" | "files changed" | "checks">("conversation");
	prMeta = $state<{ labels: Label[]; collaborators: string[] } | null>(null);
	newPrModalOpen = $state(false);
	newPrSelection = $state<{ reviewers: string[]; assignees: string[]; labels: string[] }>({
		reviewers: [],
		assignees: [],
		labels: []
	});

	issues = $state<IssueSummary[]>([]);
	issueFilter = $state<IssueStateFilter>("open");
	issueLoadError = $state<string | null>(null);

	workflowRuns = $state<WorkflowRun[]>([]);
	actionsLoadError = $state<string | null>(null);

	releases = $state<Release[]>([]);
	releasesLoadError = $state<string | null>(null);

	notifications = $state<GitHubNotification[]>([]);
	notifPanelOpen = $state(false);

	mergeConflictFileSet = $state<string[]>([]);
	conflictModalOpen = $state(false);
	activeConflictFile = $state<string | null>(null);
	conflictSides = $state<{ ours: string; theirs: string } | null>(null);
	mergedText = $state("");
	inRebase = $state(false);

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
		this.consoleAppend(lines, isErr);
	}

	/** Output lines with no new command prompt — for streamed chunks following a consoleLog that already printed the command once. */
	consoleAppend(lines: string[], isErr = false): void {
		for (const line of lines) {
			this.consoleLines.push({ kind: isErr ? "err" : "out", text: line });
		}
	}

	async init(): Promise<void> {
		await Promise.all([this.loadDetection(), this.loadSettings(), this.loadAccounts(), this.loadRepositories()]);
		void this.loadNotifications();
		void this.loadRemoteRepos();
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

	async loadRemoteRepos(): Promise<void> {
		try {
			this.remoteRepos = await githubApi.listRemoteRepos();
		} catch {
			this.remoteRepos = [];
		}
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
		await Promise.all([this.loadRepositoryAccountInfo(), this.loadRemoteRepos()]);
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

	browseModalOpen = $state(false);
	browseMode = $state<"add" | "clone">("add");
	cloneTarget = $state<RemoteRepository | null>(null);
	browseResult = $state<BrowseResult | null>(null);
	browseLoading = $state(false);
	browseError = $state<string | null>(null);
	browsePathInput = $state("");

	async openBrowseModal(): Promise<void> {
		this.browseMode = "add";
		this.cloneTarget = null;
		this.browseModalOpen = true;
		await this.browseTo(undefined);
	}

	async openCloneModal(repo: RemoteRepository): Promise<void> {
		this.browseMode = "clone";
		this.cloneTarget = repo;
		this.browseModalOpen = true;
		await this.browseTo(undefined);
	}

	closeBrowseModal(): void {
		this.browseModalOpen = false;
	}

	async browseTo(path: string | undefined): Promise<void> {
		this.browseLoading = true;
		this.browseError = null;
		try {
			this.browseResult = await filesystemApi.browseDirectory(path);
			this.browsePathInput = this.browseResult.path;
		} catch (err) {
			this.browseError = err instanceof ApiError ? err.message : "Failed to browse directory";
		} finally {
			this.browseLoading = false;
		}
	}

	async browseUp(): Promise<void> {
		if (this.browseResult?.parent) await this.browseTo(this.browseResult.parent);
	}

	async addRepositoryFromBrowser(path: string): Promise<void> {
		try {
			await this.addRepository(path);
			this.browseModalOpen = false;
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to add repository", "error");
		}
	}

	async cloneIntoBrowsedFolder(parentDir: string): Promise<void> {
		const repo = this.cloneTarget;
		if (!repo) return;
		this.browseModalOpen = false;
		this.consoleExpanded = true;
		const dest = `${parentDir.replace(/\/+$/, "")}/${repo.name}`;
		this.consoleLog(`git clone https://github.com/${repo.nameWithOwner}.git ${dest}`);
		await new Promise<void>((resolve) => {
			connectClone(repo.nameWithOwner, dest, {
				onStdout: (chunk) => this.consoleAppend([chunk.trim()]),
				onStderr: (chunk) => this.consoleAppend([chunk.trim()], true),
				onDone: async (code, path) => {
					if (code === 0) {
						this.toast(`Cloned ${repo.name}`, "success");
						try {
							await this.addRepository(path);
							await this.loadRemoteRepos();
						} catch (err) {
							this.toast(err instanceof ApiError ? err.message : "Cloned, but failed to register the repository", "error");
						}
					} else {
						this.toast(`Clone failed (exit code ${code})`, "error");
					}
					resolve();
				},
				onError: (message) => {
					this.toast(`Clone failed: ${message}`, "error");
					resolve();
				}
			});
		});
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
			case "prs":
				await this.refreshPullRequests();
				break;
			case "issues":
				await this.refreshIssues();
				break;
			case "actions":
				await this.refreshWorkflowRuns();
				break;
			case "releases":
				await this.refreshReleases();
				break;
			default:
				await this.refreshStatus(id);
		}
	}

	async refreshPullRequests(): Promise<void> {
		if (!this.activeRepoId) return;
		this.prLoadError = null;
		try {
			this.pullRequests = await prApi.listPullRequests(this.activeRepoId, this.prFilter);
		} catch (err) {
			this.prLoadError = err instanceof ApiError ? err.message : "Failed to load pull requests";
			this.pullRequests = [];
		}
	}

	async setPrFilter(filter: PullRequestStateFilter): Promise<void> {
		this.prFilter = filter;
		await this.refreshPullRequests();
	}

	async openPullRequest(number: number): Promise<void> {
		if (!this.activeRepoId) return;
		this.prDetailTab = "conversation";
		this.selectedPr = await prApi.getPullRequest(this.activeRepoId, number);
		this.activeView = "pr-detail";
	}

	async openNewPrModal(): Promise<void> {
		if (!this.activeRepoId) return;
		this.newPrSelection = { reviewers: [], assignees: [], labels: [] };
		this.newPrModalOpen = true;
		try {
			this.prMeta = await prApi.getPullRequestMeta(this.activeRepoId);
		} catch {
			this.prMeta = { labels: [], collaborators: [] };
		}
	}

	closeNewPrModal(): void {
		this.newPrModalOpen = false;
	}

	async submitNewPr(input: { title: string; body: string; base: string; head: string; draft: boolean }): Promise<void> {
		if (!this.activeRepoId) return;
		try {
			const pr = await prApi.createPullRequest(this.activeRepoId, { ...input, ...this.newPrSelection });
			this.newPrModalOpen = false;
			this.toast("Pull request opened", "success");
			this.selectedPr = pr;
			this.activeView = "pr-detail";
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to create pull request", "error");
		}
	}

	async mergePullRequest(number: number, method: "squash" | "merge" | "rebase" = "squash"): Promise<void> {
		if (!this.activeRepoId) return;
		try {
			await prApi.mergePullRequest(this.activeRepoId, number, method, false);
			this.toast(`Merged #${number}`, "success");
			await this.setActiveView("prs");
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to merge pull request", "error");
		}
	}

	async closePullRequest(number: number): Promise<void> {
		if (!this.activeRepoId) return;
		try {
			await prApi.closePullRequest(this.activeRepoId, number);
			this.toast(`Closed #${number}`, "success");
			await this.setActiveView("prs");
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to close pull request", "error");
		}
	}

	async refreshIssues(): Promise<void> {
		if (!this.activeRepoId) return;
		this.issueLoadError = null;
		try {
			this.issues = await issueApi.listIssues(this.activeRepoId, this.issueFilter);
		} catch (err) {
			this.issueLoadError = err instanceof ApiError ? err.message : "Failed to load issues";
			this.issues = [];
		}
	}

	async setIssueFilter(filter: IssueStateFilter): Promise<void> {
		this.issueFilter = filter;
		await this.refreshIssues();
	}

	async openNewIssueModal(): Promise<void> {
		if (!this.prMeta && this.activeRepoId) {
			try {
				this.prMeta = await prApi.getPullRequestMeta(this.activeRepoId);
			} catch {
				this.prMeta = { labels: [], collaborators: [] };
			}
		}
		this.openFormModal({
			title: "New issue",
			fields: [
				{ key: "title", label: "Title", type: "text", value: "" },
				{ key: "description", label: "Description", type: "textarea", value: "" },
				{
					key: "assignee",
					label: "Assignee",
					type: "select",
					value: "Unassigned",
					options: ["Unassigned", ...this.prMeta?.collaborators ?? []]
				}
			],
			submitLabel: "Create issue",
			onSubmit: async (values) => {
				const title = String(values.title ?? "").trim();
				if (!title) {
					this.toast("Title is required", "info");
					return;
				}
				if (!this.activeRepoId) return;
				try {
					const assignee = values.assignee === "Unassigned" ? null : String(values.assignee ?? "");
					const issue = await issueApi.createIssue(this.activeRepoId, { title, body: String(values.description ?? ""), assignee });
					this.toast(`Opened issue #${issue.number}`, "success");
					await this.refreshIssues();
				} catch (err) {
					this.toast(err instanceof ApiError ? err.message : "Failed to create issue", "error");
				}
			}
		});
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

	async resetToCommit(sha: string): Promise<void> {
		if (!this.activeRepoId) return;
		try {
			await api.resetHard(this.activeRepoId, sha);
			this.consoleLog(`git reset --hard ${sha.slice(0, 7)}`, [`HEAD is now at ${sha.slice(0, 7)}`]);
			this.toast(`Reset ${this.status?.branch ?? "branch"} to ${sha.slice(0, 7)}`, "success");
			await this.refreshHistory();
			await this.refreshStatus();
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Reset failed", "error");
		}
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

	async toggleHunk(hunkIndex: number, currentlyStaged: boolean): Promise<void> {
		if (!this.activeRepoId) return;
		const path = this.flatFiles[this.selectedFileIdx]?.path;
		if (!path) return;
		try {
			if (currentlyStaged) {
				await api.unstageHunk(this.activeRepoId, path, hunkIndex);
			} else {
				await api.stageHunk(this.activeRepoId, path, hunkIndex);
			}
			await this.refreshStatus();
			// Staging a hunk can shift the file between groups (or split it
			// across both when partially staged) — reselect by path, preferring
			// the group being edited so the diff pane doesn't jump unexpectedly.
			const preferredGroup = currentlyStaged ? "Modified" : "Staged";
			const nextIdx = this.flatFiles.findIndex((f) => f.path === path && f.group === preferredGroup);
			this.selectedFileIdx = nextIdx >= 0 ? nextIdx : this.flatFiles.findIndex((f) => f.path === path);
			if (this.selectedFileIdx < 0) this.selectedFileIdx = 0;
			await this.refreshDiff();
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to stage hunk", "error");
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
				onStdout: (chunk) => this.consoleAppend([chunk.trim()]),
				onStderr: (chunk) => this.consoleAppend([chunk.trim()], true),
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
				this.mergeConflictFileSet = conflicts;
				this.inRebase = false;
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
		this.mergeConflictFileSet = [];
		this.conflictModalOpen = false;
		await this.refreshStatus();
	}

	async rebaseBranch(onto: string): Promise<{ conflicts: string[] }> {
		if (!this.activeRepoId) throw new Error("No active repository");
		try {
			const result = await api.rebase(this.activeRepoId, onto);
			this.consoleLog(`git rebase ${onto}`, ["Successfully rebased and updated."]);
			this.toast(`Rebased onto ${onto}`, "success");
			await this.refreshStatus();
			await this.refreshBranches();
			return result;
		} catch (err) {
			const conflicts = err instanceof ApiError && Array.isArray(err.body?.conflicts) ? (err.body!.conflicts as string[]) : null;
			if (conflicts) {
				this.consoleLog(`git rebase ${onto}`, conflicts.map((c) => `CONFLICT (content): Merge conflict in ${c}`), true);
				this.toast(`Rebase conflict — ${conflicts.length} file(s) need resolving`, "info");
				this.mergeConflictFileSet = conflicts;
				this.inRebase = true;
				await this.refreshStatus();
				return { conflicts };
			}
			throw err;
		}
	}

	async abortRebase(): Promise<void> {
		if (!this.activeRepoId) return;
		await api.abortRebase(this.activeRepoId);
		this.consoleLog("git rebase --abort", []);
		this.toast("Rebase aborted", "success");
		this.mergeConflictFileSet = [];
		this.inRebase = false;
		this.conflictModalOpen = false;
		await this.refreshStatus();
	}

	get resolvedConflictFiles(): string[] {
		if (!this.status) return [];
		return this.mergeConflictFileSet.filter((f) => !this.status!.mergeConflicts.includes(f));
	}

	async openConflictModal(preferFile?: string): Promise<void> {
		const target = preferFile ?? this.status?.mergeConflicts[0] ?? this.mergeConflictFileSet[0];
		if (!target) return;
		this.activeConflictFile = target;
		this.conflictModalOpen = true;
		await this.loadConflictSides(target);
	}

	async loadConflictSides(path: string): Promise<void> {
		if (!this.activeRepoId) return;
		this.conflictSides = await api.getConflictSides(this.activeRepoId, path);
		this.mergedText = `<<<<<<< HEAD\n${this.conflictSides.ours}\n=======\n${this.conflictSides.theirs}\n>>>>>>> `;
	}

	closeConflictModal(): void {
		this.conflictModalOpen = false;
	}

	async markConflictResolved(): Promise<void> {
		if (!this.activeRepoId || !this.activeConflictFile) return;
		await api.resolveConflict(this.activeRepoId, this.activeConflictFile, this.mergedText);
		this.toast(`Marked ${this.activeConflictFile.split("/").pop()} resolved`, "success");
		await this.refreshStatus();
		const nextUnresolved = this.status?.mergeConflicts[0] ?? null;
		if (nextUnresolved) {
			this.activeConflictFile = nextUnresolved;
			await this.loadConflictSides(nextUnresolved);
		}
	}

	async continueMergeOrRebase(): Promise<void> {
		if (!this.activeRepoId) return;
		try {
			if (this.inRebase) {
				await api.continueRebase(this.activeRepoId);
				this.consoleLog("git rebase --continue", []);
				this.toast("Rebase continued", "success");
			} else {
				await api.continueMerge(this.activeRepoId);
				this.consoleLog("git commit", ["Merge completed."]);
				this.toast("Merge completed", "success");
			}
			this.mergeConflictFileSet = [];
			this.inRebase = false;
			this.conflictModalOpen = false;
			await this.refreshStatus();
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to continue", "error");
		}
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

	async refreshWorkflowRuns(): Promise<void> {
		if (!this.activeRepoId) return;
		this.actionsLoadError = null;
		try {
			this.workflowRuns = await actionsApi.listRuns(this.activeRepoId);
		} catch (err) {
			this.actionsLoadError = err instanceof ApiError ? err.message : "Failed to load workflow runs";
			this.workflowRuns = [];
		}
	}

	async rerunWorkflow(runId: number): Promise<void> {
		if (!this.activeRepoId) return;
		try {
			await actionsApi.rerunWorkflow(this.activeRepoId, runId);
			this.toast("Re-run triggered", "info");
			await this.refreshWorkflowRuns();
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to re-run workflow", "error");
		}
	}

	async refreshReleases(): Promise<void> {
		if (!this.activeRepoId) return;
		this.releasesLoadError = null;
		try {
			this.releases = await actionsApi.listReleases(this.activeRepoId);
		} catch (err) {
			this.releasesLoadError = err instanceof ApiError ? err.message : "Failed to load releases";
			this.releases = [];
		}
	}

	openDraftReleaseModal(): void {
		this.openFormModal({
			title: "Draft a release",
			fields: [
				{ key: "tag", label: "Tag", type: "text", value: "" },
				{ key: "title", label: "Title", type: "text", value: "" },
				{ key: "notes", label: "Release notes", type: "textarea", value: "" },
				{ key: "prerelease", label: "Mark as pre-release", type: "checkbox", value: false }
			],
			submitLabel: "Save draft",
			onSubmit: async (values) => {
				const tag = String(values.tag ?? "").trim();
				const title = String(values.title ?? "").trim();
				if (!tag || !title) {
					this.toast("Tag and title are required", "info");
					return;
				}
				if (!this.activeRepoId) return;
				try {
					await actionsApi.createRelease(this.activeRepoId, {
						tag,
						title,
						notes: String(values.notes ?? ""),
						prerelease: Boolean(values.prerelease)
					});
					this.toast(`Drafted release ${title}`, "success");
					await this.refreshReleases();
				} catch (err) {
					this.toast(err instanceof ApiError ? err.message : "Failed to draft release", "error");
				}
			}
		});
	}

	async loadNotifications(): Promise<void> {
		try {
			this.notifications = await actionsApi.listNotifications();
		} catch {
			this.notifications = [];
		}
	}

	toggleNotifPanel(): void {
		this.notifPanelOpen = !this.notifPanelOpen;
		if (this.notifPanelOpen) void this.loadNotifications();
	}

	closeNotifPanel(): void {
		this.notifPanelOpen = false;
	}

	async markAllNotificationsRead(): Promise<void> {
		try {
			await actionsApi.markNotificationsRead();
			this.notifications = this.notifications.map((n) => ({ ...n, unread: false }));
		} catch (err) {
			this.toast(err instanceof ApiError ? err.message : "Failed to mark notifications read", "error");
		}
	}

	/**
	 * Navigates within Quay when the notification's repo is one we have
	 * registered locally and we can tell what it points at (PR or issue,
	 * with a parsed number); otherwise falls back to opening it on
	 * github.com, since there's nothing in-app to jump to for e.g. a
	 * Discussion/CheckSuite notification or a repo we haven't added.
	 */
	async openNotification(n: GitHubNotification): Promise<void> {
		n.unread = false;
		void actionsApi.markNotificationRead(n.id).catch(() => undefined);

		const localRepo = this.repositories.find((r) => r.nameWithOwner?.toLowerCase() === n.repo.toLowerCase());
		if (localRepo && n.number && (n.type === "PullRequest" || n.type === "Issue")) {
			await this.selectRepo(localRepo.id);
			if (n.type === "PullRequest") {
				await this.openPullRequest(n.number);
			} else {
				await this.setActiveView("issues");
			}
			this.closeNotifPanel();
			return;
		}

		if (n.url) window.open(n.url, "_blank", "noopener,noreferrer");
		this.closeNotifPanel();
	}
}

export const quay = new QuayState();
