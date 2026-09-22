<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	const tabs = ["conversation", "commits", "files changed", "checks"] as const;

	let pr = $derived(quay.selectedPr);

	function stateBadgeClass(state: string): string {
		return state === "open" ? "badge-green" : state === "merged" ? "badge-violet" : "badge-red";
	}
</script>

<div class="view active">
	{#if pr}
		<button class="btn btn-sm" style="margin-bottom:14px;" onclick={() => quay.setActiveView("prs")}>
			<Icon name="chevronRight" class="icon-sm" /> Back to pull requests
		</button>
		<div class="pr-detail-head">
			<div>
				<div style="font-size:17px;font-weight:700;margin-bottom:4px;">
					{pr.title} <span class="muted" style="font-weight:500;">#{pr.number}</span>
				</div>
				<div class="row g-8">
					<span class="badge {stateBadgeClass(pr.state)}">{pr.state.charAt(0).toUpperCase() + pr.state.slice(1)}</span>
					<span class="mono muted" style="font-size:12px;">{pr.headRefName} → {pr.baseRefName}</span>
				</div>
			</div>
			<div class="col g-8" style="align-items:flex-end;">
				{#if pr.state === "open" && !pr.draft}
					<button
						class="btn btn-primary btn-sm"
						onclick={() =>
							quay.openConfirm(`Merge #${pr.number} into ${pr.baseRefName}?`, `Squashes ${pr.headRefName} into a single commit on ${pr.baseRefName}.`, () =>
								quay.mergePullRequest(pr.number, "squash")
							)}
					>
						Squash and merge
					</button>
				{/if}
				{#if pr.state === "open"}
					<button
						class="btn btn-sm"
						onclick={() =>
							quay.openConfirm(
								`Close #${pr.number} without merging?`,
								"The branch and its commits stay untouched — this only closes the pull request.",
								() => quay.closePullRequest(pr.number)
							)}
					>
						Close pull request
					</button>
				{/if}
			</div>
		</div>
		<div class="pr-tabs">
			{#each tabs as tab (tab)}
				<div
					class="pr-tab"
					class:active={quay.prDetailTab === tab}
					onclick={() => (quay.prDetailTab = tab)}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (quay.prDetailTab = tab)}
					role="button"
					tabindex="0"
				>
					{tab.charAt(0).toUpperCase() + tab.slice(1)}
				</div>
			{/each}
		</div>
		<div style="max-width:760px;">
			{#if quay.prDetailTab === "conversation"}
				<div class="panel panel-pad" style="margin-bottom:14px;"><p style="margin:0;">{pr.body || "No description provided."}</p></div>
				{#if pr.reviewDecision}
					<div class="panel panel-pad">
						<div class="section-title">Review status</div>
						<div class="review-row">
							<Icon name="check" class="icon-sm" />
							<span>{pr.reviewDecision}</span>
						</div>
					</div>
				{/if}
			{:else if quay.prDetailTab === "commits"}
				{#each pr.commits as commit (commit.sha)}
					<div class="commit-line">
						<Icon name="commit" class="icon-sm" />
						<div class="grow">
							<div>{commit.message}</div>
							<div class="muted" style="font-size:11.5px;"><span class="commit-sha">{commit.sha.slice(0, 7)}</span></div>
						</div>
					</div>
				{/each}
			{:else if quay.prDetailTab === "files changed"}
				{#each pr.files as file (file.path)}
					<div class="commit-line" style="padding:6px 0;">
						<span class="status-flag status-M">M</span>
						<span class="mono" style="font-size:12.3px;">{file.path}</span>
						<span class="muted" style="font-size:11px;margin-left:auto;">
							<span style="color:var(--green);">+{file.additions}</span> <span style="color:var(--red);">-{file.deletions}</span>
						</span>
					</div>
				{/each}
			{:else}
				<div class="review-row">
					{#if pr.checkStatus === "pass"}
						<Icon name="check" class="icon-sm" /><span style="color:var(--green);">All checks passed</span>
					{:else if pr.checkStatus === "fail"}
						<Icon name="x" class="icon-sm" /><span style="color:var(--red);">Checks failed</span>
					{:else if pr.checkStatus === "pending"}
						<Icon name="clock" class="icon-sm" /><span style="color:var(--amber);">Checks running</span>
					{:else}
						<span class="muted">No checks configured</span>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="muted">No pull request selected.</div>
	{/if}
</div>
