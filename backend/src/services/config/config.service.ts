import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_SETTINGS, type Settings } from "shared";

export function defaultConfigDir(): string {
	const xdg = process.env.XDG_CONFIG_HOME;
	return xdg && xdg.length > 0 ? path.join(xdg, "quay") : path.join(os.homedir(), ".config", "quay");
}

/** Flat, single-value settings file per ARCHITECTURE.md §9 — no SQLite here. */
export class ConfigService {
	private readonly filePath: string;

	constructor(configDir: string = defaultConfigDir()) {
		this.filePath = path.join(configDir, "config.json");
	}

	async read(): Promise<Settings> {
		try {
			const raw = await fs.readFile(this.filePath, "utf-8");
			const parsed = JSON.parse(raw) as Partial<Settings>;
			return { ...DEFAULT_SETTINGS, ...parsed };
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return { ...DEFAULT_SETTINGS };
			}
			throw err;
		}
	}

	async write(settings: Settings): Promise<void> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });
		await fs.writeFile(this.filePath, `${JSON.stringify(settings, null, "\t")}\n`, "utf-8");
	}
}
