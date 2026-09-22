import { getDb } from "../db/index.js";
import { GitService } from "../services/git/git.service.js";
import { RepositoryOperationQueue } from "../services/git/operation-queue.js";
import { GitHubAccountService } from "../services/github/github-account.service.js";
import { IssueService } from "../services/github/issue.service.js";
import { PullRequestService } from "../services/github/pull-request.service.js";
import { RepositoryService } from "../services/repository/repository.service.js";
import { RepoWatcher } from "../services/watch/repo-watcher.js";
import { broadcastRepoChanged } from "../ws/events.js";

export const repositoryService = new RepositoryService(getDb());
export const gitService = new GitService();
export const operationQueue = new RepositoryOperationQueue();
export const repoWatcher = new RepoWatcher(broadcastRepoChanged);
export const githubAccountService = new GitHubAccountService();
export const pullRequestService = new PullRequestService();
export const issueService = new IssueService();
