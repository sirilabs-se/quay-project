import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "shared";
import { ConfigService } from "../services/config/config.service.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = await mkdtemp(path.join(os.tmpdir(), "quay-config-test-"));
});

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

describe("ConfigService", () => {
	it("returns default settings when no config file exists yet", async () => {
		const service = new ConfigService(tmpDir);
		const settings = await service.read();
		expect(settings).toEqual(DEFAULT_SETTINGS);
	});

	it("round-trips a write then read", async () => {
		const service = new ConfigService(tmpDir);
		await service.write({ ...DEFAULT_SETTINGS, theme: "dark", refreshIntervalSeconds: 30 });

		const reread = await service.read();
		expect(reread.theme).toBe("dark");
		expect(reread.refreshIntervalSeconds).toBe(30);
	});

	it("merges missing fields from defaults when reading a partial file", async () => {
		const service = new ConfigService(tmpDir);
		await service.write({ ...DEFAULT_SETTINGS, editorPath: "/usr/bin/vim" });

		const reread = await service.read();
		expect(reread.editorPath).toBe("/usr/bin/vim");
		expect(reread.theme).toBe(DEFAULT_SETTINGS.theme);
	});
});
