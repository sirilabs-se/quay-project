import type { BrowseResult } from "shared";
import { apiFetch } from "./client";

export function browseDirectory(path?: string): Promise<BrowseResult> {
	const query = path ? `?path=${encodeURIComponent(path)}` : "";
	return apiFetch(`/api/filesystem/browse${query}`);
}
