import type { IncomingMessage, ServerResponse } from "node:http";
import { handleDetection } from "./detection.js";
import { handleListAccounts, handleRepositoryAccount, handleSwitchAccount } from "./github.js";
import { handleCreateIssue, handleListIssues } from "./issues.js";
import {
	handleClosePullRequest,
	handleCreatePullRequest,
	handleGetPullRequest,
	handleListPullRequests,
	handleMergePullRequest,
	handlePullRequestMeta
} from "./pull-requests.js";
import { handleGetSettings, handlePutSettings } from "./settings.js";
import {
	handleAddRemote,
	handleAddRepository,
	handleCheckoutBranch,
	handleCommit,
	handleCommitDetail,
	handleCreateBranch,
	handleCreateTag,
	handleDeleteBranch,
	handleDiscardFile,
	handleGetBranches,
	handleGetDiff,
	handleGetHistory,
	handleGetRemotes,
	handleGetStashes,
	handleGetStatus,
	handleGetTags,
	handleListRepositories,
	handleMergeAbort,
	handleMergeBranch,
	handleRemoveRepository,
	handleStageFiles,
	handleStashApply,
	handleStashDrop,
	handleStashPop,
	handleStashSave,
	handleUnstageFiles,
	handleUpdateRepository
} from "./repositories.js";

export type ApiHandler = (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => Promise<void>;

interface Route {
	method: string;
	pattern: RegExp;
	handler: ApiHandler;
}

const routes: Route[] = [
	{ method: "GET", pattern: /^\/api\/detection$/, handler: handleDetection },
	{ method: "GET", pattern: /^\/api\/settings$/, handler: handleGetSettings },
	{ method: "PUT", pattern: /^\/api\/settings$/, handler: handlePutSettings },

	{ method: "GET", pattern: /^\/api\/repositories$/, handler: handleListRepositories },
	{ method: "POST", pattern: /^\/api\/repositories$/, handler: handleAddRepository },
	{ method: "DELETE", pattern: /^\/api\/repositories\/(?<id>[^/]+)$/, handler: handleRemoveRepository },
	{ method: "PATCH", pattern: /^\/api\/repositories\/(?<id>[^/]+)$/, handler: handleUpdateRepository },

	{ method: "GET", pattern: /^\/api\/github\/accounts$/, handler: handleListAccounts },
	{ method: "POST", pattern: /^\/api\/github\/accounts\/switch$/, handler: handleSwitchAccount },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/status$/, handler: handleGetStatus },
	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/account$/, handler: handleRepositoryAccount },
	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/diff$/, handler: handleGetDiff },

	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/stage$/, handler: handleStageFiles },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/unstage$/, handler: handleUnstageFiles },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/discard$/, handler: handleDiscardFile },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/commit$/, handler: handleCommit },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/branches$/, handler: handleGetBranches },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/branches$/, handler: handleCreateBranch },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/branches\/checkout$/, handler: handleCheckoutBranch },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/branches\/delete$/, handler: handleDeleteBranch },

	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/merge$/, handler: handleMergeBranch },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/merge\/abort$/, handler: handleMergeAbort },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/history$/, handler: handleGetHistory },
	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/commits\/(?<sha>[^/]+)$/, handler: handleCommitDetail },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/stashes$/, handler: handleGetStashes },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/stashes$/, handler: handleStashSave },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/stashes\/apply$/, handler: handleStashApply },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/stashes\/pop$/, handler: handleStashPop },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/stashes\/drop$/, handler: handleStashDrop },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/tags$/, handler: handleGetTags },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/tags$/, handler: handleCreateTag },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/remotes$/, handler: handleGetRemotes },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/remotes$/, handler: handleAddRemote },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/pulls$/, handler: handleListPullRequests },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/pulls$/, handler: handleCreatePullRequest },
	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/pulls\/meta$/, handler: handlePullRequestMeta },
	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/pulls\/(?<number>\d+)$/, handler: handleGetPullRequest },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/pulls\/(?<number>\d+)\/merge$/, handler: handleMergePullRequest },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/pulls\/(?<number>\d+)\/close$/, handler: handleClosePullRequest },

	{ method: "GET", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/issues$/, handler: handleListIssues },
	{ method: "POST", pattern: /^\/api\/repositories\/(?<id>[^/]+)\/issues$/, handler: handleCreateIssue }
];

/** Returns true if a route matched (and handled the response), false otherwise. */
export async function routeApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
	const url = new URL(req.url ?? "/", "http://internal");
	for (const route of routes) {
		if (route.method !== req.method) continue;
		const match = url.pathname.match(route.pattern);
		if (match) {
			await route.handler(req, res, match.groups ?? {});
			return true;
		}
	}
	return false;
}
