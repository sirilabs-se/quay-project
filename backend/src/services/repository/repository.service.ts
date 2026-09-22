import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import type { Repository } from "shared";
import { runProcess } from "../process/exec.js";

export class RepositoryNotFoundError extends Error {
	constructor(id: string) {
		super(`Repository ${id} not found`);
		this.name = "RepositoryNotFoundError";
	}
}

export class InvalidRepositoryPathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidRepositoryPathError";
	}
}

interface RepositoryRow {
	id: string;
	name: string;
	path: string;
	favorite: number;
}

function rowToRepository(row: RepositoryRow): Repository {
	return { id: row.id, name: row.name, path: row.path, favorite: row.favorite === 1 };
}

export class RepositoryService {
	constructor(private readonly db: Database.Database) {}

	list(): Repository[] {
		const rows = this.db
			.prepare("SELECT id, name, path, favorite FROM repositories ORDER BY favorite DESC, name ASC")
			.all() as RepositoryRow[];
		return rows.map(rowToRepository);
	}

	get(id: string): Repository {
		const row = this.db.prepare("SELECT id, name, path, favorite FROM repositories WHERE id = ?").get(id) as
			| RepositoryRow
			| undefined;
		if (!row) throw new RepositoryNotFoundError(id);
		return rowToRepository(row);
	}

	async add(inputPath: string): Promise<Repository> {
		const resolved = await this.resolveGitRoot(inputPath);
		const name = path.basename(resolved);
		const id = randomUUID();
		try {
			this.db.prepare("INSERT INTO repositories (id, name, path, favorite) VALUES (?, ?, ?, 0)").run(id, name, resolved);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes("UNIQUE")) {
				throw new InvalidRepositoryPathError(`${resolved} is already registered`);
			}
			throw err;
		}
		return { id, name, path: resolved, favorite: false };
	}

	remove(id: string): void {
		const result = this.db.prepare("DELETE FROM repositories WHERE id = ?").run(id);
		if (result.changes === 0) throw new RepositoryNotFoundError(id);
	}

	setFavorite(id: string, favorite: boolean): Repository {
		const result = this.db.prepare("UPDATE repositories SET favorite = ? WHERE id = ?").run(favorite ? 1 : 0, id);
		if (result.changes === 0) throw new RepositoryNotFoundError(id);
		return this.get(id);
	}

	private async resolveGitRoot(inputPath: string): Promise<string> {
		let real: string;
		try {
			real = await realpath(inputPath);
		} catch {
			throw new InvalidRepositoryPathError(`${inputPath} does not exist`);
		}
		try {
			const { stdout } = await runProcess("git", ["-C", real, "rev-parse", "--show-toplevel"]);
			return stdout.trim();
		} catch {
			throw new InvalidRepositoryPathError(`${inputPath} is not a git repository`);
		}
	}
}
