<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";
	import type { IssueStateFilter } from "$lib/api/issues";

	const chips: { key: IssueStateFilter; label: string }[] = [
		{ key: "open", label: "Open" },
		{ key: "closed", label: "Closed" },
		{ key: "all", label: "All" }
	];
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="filter-chips">
			{#each chips as chip (chip.key)}
				<div
					class="filter-chip"
					class:active={quay.issueFilter === chip.key}
					onclick={() => quay.setIssueFilter(chip.key)}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.setIssueFilter(chip.key)}
					role="button"
					tabindex="0"
				>
					{chip.label}
				</div>
			{/each}
		</div>
		<button class="btn btn-primary btn-sm" onclick={() => quay.openNewIssueModal()}><Icon name="plus" class="icon-sm" /> New issue</button>
	</div>

	{#if quay.issueLoadError}
		<div class="warn-banner"><Icon name="bolt" /><div>{quay.issueLoadError}</div></div>
	{:else if quay.issues.length === 0}
		<div class="panel panel-pad" style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
			<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">No issues here</div>
			<div style="font-size:12.5px;">Try a different filter.</div>
		</div>
	{:else}
		{#each quay.issues as issue (issue.number)}
			<div class="item-row">
				<span class="item-icon" style="color:{issue.state === 'open' ? 'var(--green)' : 'var(--violet)'};"><Icon name="issue" /></span>
				<div class="grow">
					<div class="item-title">{issue.title} <span class="num">#{issue.number}</span></div>
					<div class="item-sub">
						{issue.assignee ? `assigned to ${issue.assignee}` : "unassigned"} · updated {new Date(issue.updatedAt).toLocaleString()}
						{#each issue.labels as label (label.name)}
							<span class="badge badge-muted">{label.name}</span>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
