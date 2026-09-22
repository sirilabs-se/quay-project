<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";
	import type { PullRequestStateFilter } from "$lib/api/pull-requests";

	const chips: { key: PullRequestStateFilter; label: string }[] = [
		{ key: "open", label: "Open" },
		{ key: "draft", label: "Draft" },
		{ key: "merged", label: "Merged" },
		{ key: "closed", label: "Closed" },
		{ key: "all", label: "All" }
	];

	function stateColor(state: string): string {
		return state === "merged" ? "var(--violet)" : state === "closed" ? "var(--red)" : "var(--green)";
	}
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="filter-chips">
			{#each chips as chip (chip.key)}
				<div
					class="filter-chip"
					class:active={quay.prFilter === chip.key}
					onclick={() => quay.setPrFilter(chip.key)}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.setPrFilter(chip.key)}
					role="button"
					tabindex="0"
				>
					{chip.label}
				</div>
			{/each}
		</div>
		<button class="btn btn-primary btn-sm" onclick={() => quay.openNewPrModal()}><Icon name="plus" class="icon-sm" /> New pull request</button>
	</div>

	{#if quay.prLoadError}
		<div class="warn-banner"><Icon name="bolt" /><div>{quay.prLoadError}</div></div>
	{:else if quay.pullRequests.length === 0}
		<div class="panel panel-pad" style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
			<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">No pull requests here</div>
			<div style="font-size:12.5px;">Try a different filter, or open a new one.</div>
		</div>
	{:else}
		{#each quay.pullRequests as pr (pr.number)}
			<div
				class="item-row"
				onclick={() => quay.openPullRequest(pr.number)}
				onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.openPullRequest(pr.number)}
				role="button"
				tabindex="0"
			>
				<span class="item-icon" style="color:{stateColor(pr.state)};"><Icon name="pr" /></span>
				<div class="grow">
					<div class="item-title">
						{pr.title} <span class="num">#{pr.number}</span>
						{#if pr.draft}<span class="badge badge-muted">Draft</span>{/if}
					</div>
					<div class="item-sub">
						{#if pr.checkStatus === "pass"}
							<span style="color:var(--green);"><Icon name="check" class="icon-sm" /></span>
						{:else if pr.checkStatus === "fail"}
							<span style="color:var(--red);"><Icon name="x" class="icon-sm" /></span>
						{:else if pr.checkStatus === "pending"}
							<span style="color:var(--amber);"><Icon name="clock" class="icon-sm" /></span>
						{/if}
						<span class="mono">{pr.headRefName} → {pr.baseRefName}</span> · opened by {pr.author} · updated {new Date(
							pr.updatedAt
						).toLocaleString()}
						{#each pr.labels as label (label.name)}
							<span class="badge badge-muted">{label.name}</span>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
