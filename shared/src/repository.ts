export interface Repository {
	id: string;
	name: string;
	path: string;
	favorite: boolean;
}

export interface RepositoryStatus {
	branch: string | null;
	ahead: number;
	behind: number;
	staged: FileChange[];
	modified: FileChange[];
	untracked: FileChange[];
	lastCommit: CommitSummary | null;
	remoteUrl: string | null;
	merging: boolean;
	mergeConflicts: string[];
}

export type FileStatusFlag = "M" | "A" | "D" | "R" | "?" | "U";

export interface FileChange {
	path: string;
	flag: FileStatusFlag;
}

export interface CommitSummary {
	sha: string;
	message: string;
	author: string;
	authorEmail: string;
	date: string;
}

export interface CommitDetail extends CommitSummary {
	body: string;
	files: FileChange[];
}

export interface Branch {
	name: string;
	current: boolean;
	ahead: number;
	behind: number;
	tracking: string | null;
	lastCommitDate: string | null;
}

export interface Tag {
	name: string;
	sha: string;
	date: string;
}

export interface Remote {
	name: string;
	fetchUrl: string;
	pushUrl: string;
}

export interface Stash {
	index: number;
	message: string;
	branch: string;
	date: string;
}

export interface DiffLine {
	type: "context" | "add" | "del";
	oldLine: number | null;
	newLine: number | null;
	text: string;
}

export interface DiffHunk {
	header: string;
	lines: DiffLine[];
}

export interface FileDiff {
	path: string;
	hunks: DiffHunk[];
	binary: boolean;
}
