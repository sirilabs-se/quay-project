import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface SshHostConfig {
	host: string;
	hostName?: string;
}

export function parseSshConfigContent(raw: string): SshHostConfig[] {
	const entries: SshHostConfig[] = [];
	let current: SshHostConfig | null = null;

	for (const rawLine of raw.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0 || line.startsWith("#")) continue;

		const hostMatch = line.match(/^Host\s+(\S+)/i);
		if (hostMatch) {
			if (current) entries.push(current);
			current = { host: hostMatch[1] };
			continue;
		}
		const hostNameMatch = line.match(/^HostName\s+(\S+)/i);
		if (hostNameMatch && current) {
			current.hostName = hostNameMatch[1];
		}
	}
	if (current) entries.push(current);

	return entries;
}

export async function readSshConfig(filePath: string = path.join(os.homedir(), ".ssh", "config")): Promise<SshHostConfig[]> {
	try {
		const raw = await readFile(filePath, "utf-8");
		return parseSshConfigContent(raw);
	} catch {
		return [];
	}
}

/** Resolves an SSH `Host` alias (e.g. `github-work`) to its real HostName, per ARCHITECTURE.md §8. */
export function resolveSshAliasHost(alias: string, entries: SshHostConfig[]): string {
	return entries.find((e) => e.host === alias)?.hostName ?? alias;
}
