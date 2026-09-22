import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { defaultConfigDir } from "../services/config/config.service.js";

let instance: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS repositories (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	path TEXT NOT NULL UNIQUE,
	favorite INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDatabase(dbDir: string = defaultConfigDir()): Database.Database {
	mkdirSync(dbDir, { recursive: true });
	const db = new Database(path.join(dbDir, "quay.db"));
	db.pragma("journal_mode = WAL");
	db.exec(SCHEMA);
	return db;
}

/** Process-wide singleton, backed by the real XDG config dir. */
export function getDb(): Database.Database {
	if (!instance) {
		instance = openDatabase();
	}
	return instance;
}
