import type { GitHubAccount, GitHubNotification } from "shared";
import { runGhAsAccountGlobal } from "./gh-cli.service.js";

interface GhNotificationJson {
	id: string;
	unread: boolean;
	reason: string;
	subject: { title: string; type: string; url: string | null };
	repository: { full_name: string };
	updated_at: string;
}

/** The notifications API gives an api.github.com subject URL, not a browser-openable one — converts it and pulls out the issue/PR number along the way. */
export function webUrlAndNumber(apiUrl: string | null): { url: string | null; number: number | null } {
	if (!apiUrl) return { url: null, number: null };
	const match = apiUrl.match(/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/(issues|pulls)\/(\d+)$/);
	if (!match) return { url: null, number: null };
	const [, repo, kind, num] = match;
	const webKind = kind === "pulls" ? "pull" : "issues";
	return { url: `https://github.com/${repo}/${webKind}/${num}`, number: Number(num) };
}

export function mapNotification(json: GhNotificationJson): GitHubNotification {
	const { url, number } = webUrlAndNumber(json.subject.url);
	return {
		id: json.id,
		unread: json.unread,
		reason: json.reason,
		title: json.subject.title,
		type: json.subject.type,
		repo: json.repository.full_name,
		updatedAt: json.updated_at,
		url,
		number
	};
}

export class NotificationsService {
	async list(account: GitHubAccount): Promise<GitHubNotification[]> {
		const { stdout } = await runGhAsAccountGlobal(account, ["api", "notifications?all=false", "--paginate"]);
		const json = JSON.parse(stdout) as GhNotificationJson[];
		return json.map(mapNotification);
	}

	async markAllRead(account: GitHubAccount): Promise<void> {
		await runGhAsAccountGlobal(account, ["api", "-X", "PUT", "notifications", "-f", `last_read_at=${new Date().toISOString()}`]);
	}

	async markRead(account: GitHubAccount, threadId: string): Promise<void> {
		await runGhAsAccountGlobal(account, ["api", "-X", "PATCH", `notifications/threads/${threadId}`]);
	}
}
