import type { CreateReleaseInput, GitHubAccount, Release } from "shared";
import { runGhAsAccount } from "./gh-cli.service.js";

const FIELDS = "tagName,name,publishedAt,isPrerelease,isDraft,createdAt";

interface GhReleaseJson {
	tagName: string;
	name: string;
	publishedAt: string | null;
	isPrerelease: boolean;
	isDraft: boolean;
	createdAt: string;
}

function mapRelease(json: GhReleaseJson): Release {
	return {
		tag: json.tagName,
		title: json.name || json.tagName,
		publishedAt: json.publishedAt ?? json.createdAt,
		prerelease: json.isPrerelease,
		draft: json.isDraft
	};
}

export class ReleasesService {
	async list(repoPath: string, account: GitHubAccount): Promise<Release[]> {
		const { stdout } = await runGhAsAccount(repoPath, account, ["release", "list", "--json", FIELDS, "-L", "30"]);
		return (JSON.parse(stdout) as GhReleaseJson[]).map(mapRelease);
	}

	async createDraft(repoPath: string, account: GitHubAccount, input: CreateReleaseInput): Promise<Release> {
		const args = ["release", "create", input.tag, "--title", input.title, "--notes", input.notes, "--draft"];
		if (input.prerelease) args.push("--prerelease");
		await runGhAsAccount(repoPath, account, args);
		const { stdout } = await runGhAsAccount(repoPath, account, ["release", "view", input.tag, "--json", FIELDS]);
		return mapRelease(JSON.parse(stdout) as GhReleaseJson);
	}
}
