import path from "node:path";

export class PathEscapesRepositoryError extends Error {
	constructor(relativePath: string) {
		super(`Path escapes the repository root: ${relativePath}`);
		this.name = "PathEscapesRepositoryError";
	}
}

/**
 * Resolves a client-supplied repo-relative path against the repository root
 * and rejects anything that would escape it (`../`, absolute paths). Per
 * ARCHITECTURE.md §6, every filesystem path from the client must be checked
 * against the registered repository root before touching disk.
 */
export function resolveWithinRepo(repoRoot: string, relativePath: string): string {
	const resolved = path.resolve(repoRoot, relativePath);
	const normalizedRoot = path.resolve(repoRoot) + path.sep;
	if (!resolved.startsWith(normalizedRoot) && resolved !== path.resolve(repoRoot)) {
		throw new PathEscapesRepositoryError(relativePath);
	}
	return resolved;
}

/** Same check, but returns the path relative to the repo root (for passing to git argv). */
export function assertWithinRepo(repoRoot: string, relativePath: string): string {
	resolveWithinRepo(repoRoot, relativePath);
	return relativePath;
}
