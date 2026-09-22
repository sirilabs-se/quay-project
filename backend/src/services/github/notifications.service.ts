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

function mapNotification(json: GhNotificationJson): GitHubNotification {
	return {
		id: json.id,
		unread: json.unread,
		reason: json.reason,
		title: json.subject.title,
		type: json.subject.type,
		repo: json.repository.full_name,
		updatedAt: json.updated_at,
		url: json.subject.url
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
}
