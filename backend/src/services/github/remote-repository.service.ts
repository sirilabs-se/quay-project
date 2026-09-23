import type { GitHubAccount, RemoteRepository } from "shared";
import { runGhAsAccountGlobal } from "./gh-cli.service.js";

const FIELDS = "name,nameWithOwner,url,isPrivate,description,updatedAt";

export interface GhRepoJson {
	name: string;
	nameWithOwner: string;
	url: string;
	isPrivate: boolean;
	description: string;
	updatedAt: string;
}

export function mapRepo(json: GhRepoJson): RemoteRepository {
	return {
		name: json.name,
		nameWithOwner: json.nameWithOwner,
		url: json.url,
		isPrivate: json.isPrivate,
		description: json.description || null,
		updatedAt: json.updatedAt
	};
}

export class RemoteRepositoryService {
	/** The authenticated account's own repos (gh repo list defaults to the caller, not orgs). */
	async listForAccount(account: GitHubAccount): Promise<RemoteRepository[]> {
		const { stdout } = await runGhAsAccountGlobal(account, ["repo", "list", "--json", FIELDS, "-L", "100"]);
		return (JSON.parse(stdout) as GhRepoJson[]).map(mapRepo);
	}
}
