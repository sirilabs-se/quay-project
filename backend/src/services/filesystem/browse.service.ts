import { access, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BrowseEntry, BrowseResult } from "shared";

async function isDirectory(entryPath: string): Promise<boolean> {
	try {
		return (await stat(entryPath)).isDirectory();
	} catch {
		return false;
	}
}

async function isGitRepo(entryPath: string): Promise<boolean> {
	try {
		await access(path.join(entryPath, ".git"));
		return true;
	} catch {
		return false;
	}
}

/** Lists the subdirectories of a path (defaulting to the user's home dir), flagging which ones look like git repos. */
export async function browseDirectory(inputPath?: string): Promise<BrowseResult> {
	const target = path.resolve(inputPath && inputPath.length > 0 ? inputPath : os.homedir());

	const stats = await stat(target).catch(() => {
		throw new Error(`${target} does not exist`);
	});
	if (!stats.isDirectory()) {
		throw new Error(`${target} is not a directory`);
	}

	let dirents;
	try {
		dirents = await readdir(target, { withFileTypes: true });
	} catch {
		throw new Error(`Cannot read ${target} (permission denied)`);
	}

	const entries: BrowseEntry[] = [];
	for (const dirent of dirents) {
		if (dirent.name.startsWith(".")) continue; // skip dotfiles/dirs — .git et al. clutter the picker
		const entryPath = path.join(target, dirent.name);
		const directory = dirent.isDirectory() || (dirent.isSymbolicLink() && (await isDirectory(entryPath)));
		if (!directory) continue;
		entries.push({ name: dirent.name, path: entryPath, isGitRepo: await isGitRepo(entryPath) });
	}
	entries.sort((a, b) => a.name.localeCompare(b.name));

	const parentPath = path.dirname(target);
	return { path: target, parent: parentPath === target ? null : parentPath, entries };
}
