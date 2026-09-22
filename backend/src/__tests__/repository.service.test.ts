import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/index.js";
import {
	InvalidRepositoryPathError,
	RepositoryNotFoundError,
	RepositoryService
} from "../services/repository/repository.service.js";
import { createTempRepo } from "./helpers/temp-repo.js";

let dbDir: string;
let db: Database.Database;
let service: RepositoryService;

beforeEach(async () => {
	dbDir = await mkdtemp(path.join(os.tmpdir(), "quay-db-test-"));
	db = openDatabase(dbDir);
	service = new RepositoryService(db);
});

afterEach(async () => {
	db.close();
	await rm(dbDir, { recursive: true, force: true });
});

describe("RepositoryService", () => {
	it("registers a valid git repository, resolving its toplevel path", async () => {
		const repoPath = await createTempRepo();
		try {
			const repo = await service.add(repoPath);
			expect(repo.path).toBe(repoPath);
			expect(repo.favorite).toBe(false);
			expect(service.list()).toEqual([repo]);
		} finally {
			await rm(repoPath, { recursive: true, force: true });
		}
	});

	it("rejects a path that is not a git repository", async () => {
		const notARepo = await mkdtemp(path.join(os.tmpdir(), "quay-not-a-repo-"));
		try {
			await expect(service.add(notARepo)).rejects.toThrow(InvalidRepositoryPathError);
		} finally {
			await rm(notARepo, { recursive: true, force: true });
		}
	});

	it("rejects a path that does not exist", async () => {
		await expect(service.add("/nonexistent/path/for/sure")).rejects.toThrow(InvalidRepositoryPathError);
	});

	it("rejects registering the same repository twice", async () => {
		const repoPath = await createTempRepo();
		try {
			await service.add(repoPath);
			await expect(service.add(repoPath)).rejects.toThrow(InvalidRepositoryPathError);
		} finally {
			await rm(repoPath, { recursive: true, force: true });
		}
	});

	it("removes a registered repository", async () => {
		const repoPath = await createTempRepo();
		try {
			const repo = await service.add(repoPath);
			service.remove(repo.id);
			expect(service.list()).toEqual([]);
			expect(() => service.get(repo.id)).toThrow(RepositoryNotFoundError);
		} finally {
			await rm(repoPath, { recursive: true, force: true });
		}
	});

	it("toggles favorite status", async () => {
		const repoPath = await createTempRepo();
		try {
			const repo = await service.add(repoPath);
			const updated = service.setFavorite(repo.id, true);
			expect(updated.favorite).toBe(true);
			expect(service.get(repo.id).favorite).toBe(true);
		} finally {
			await rm(repoPath, { recursive: true, force: true });
		}
	});

	it("throws when removing an unknown repository", () => {
		expect(() => service.remove("does-not-exist")).toThrow(RepositoryNotFoundError);
	});
});
