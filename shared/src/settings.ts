/** Flat, single-value settings per ARCHITECTURE.md §9 — no relational data. */
export interface Settings {
	editorPath: string | null;
	terminalCommand: string | null;
	theme: "light" | "dark" | "system";
	refreshIntervalSeconds: number;
}

export const DEFAULT_SETTINGS: Settings = {
	editorPath: null,
	terminalCommand: null,
	theme: "system",
	refreshIntervalSeconds: 15
};
