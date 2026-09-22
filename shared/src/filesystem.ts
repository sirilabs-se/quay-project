export interface BrowseEntry {
	name: string;
	path: string;
	isGitRepo: boolean;
}

export interface BrowseResult {
	path: string;
	parent: string | null;
	entries: BrowseEntry[];
}
