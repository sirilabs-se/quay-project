<script lang="ts">
	import { quay, type ViewName } from "$lib/state/app-state.svelte";

	const localTabs: { view: ViewName; label: string }[] = [
		{ view: "overview", label: "Overview" },
		{ view: "changes", label: "Changes" },
		{ view: "branches", label: "Branches" },
		{ view: "history", label: "History" },
		{ view: "stashes", label: "Stashes" },
		{ view: "tags", label: "Tags" },
		{ view: "remotes", label: "Remotes" }
	];
	const githubTabs: { view: ViewName; label: string }[] = [
		{ view: "prs", label: "Pull requests" },
		{ view: "issues", label: "Issues" },
		{ view: "actions", label: "Actions" },
		{ view: "releases", label: "Releases" },
		{ view: "settings", label: "Settings" }
	];

	let changesCount = $derived(quay.flatFiles.length);
	let prCount = $derived(quay.pullRequests.filter((p) => p.state === "open").length);

	function isActive(view: ViewName): boolean {
		return quay.activeView === view || (quay.activeView === "pr-detail" && view === "prs");
	}

	function activate(view: ViewName): void {
		void quay.setActiveView(view);
	}

	function onTabKeydown(e: KeyboardEvent, view: ViewName): void {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			activate(view);
		}
	}
</script>

<div class="subnav">
	<div class="subnav-group">
		{#each localTabs as tab (tab.view)}
			<div
				class="subnav-tab"
				class:active={isActive(tab.view)}
				onclick={() => activate(tab.view)}
				onkeydown={(e) => onTabKeydown(e, tab.view)}
				role="button"
				tabindex="0"
			>
				{tab.label}
				{#if tab.view === "changes" && changesCount > 0}<span class="count">({changesCount})</span>{/if}
			</div>
		{/each}
	</div>
	<div class="subnav-divider"></div>
	<div class="subnav-group">
		{#each githubTabs as tab (tab.view)}
			<div
				class="subnav-tab"
				class:active={isActive(tab.view)}
				onclick={() => activate(tab.view)}
				onkeydown={(e) => onTabKeydown(e, tab.view)}
				role="button"
				tabindex="0"
			>
				{tab.label}
				{#if tab.view === "prs" && prCount > 0}<span class="count">({prCount})</span>{/if}
			</div>
		{/each}
	</div>
</div>
