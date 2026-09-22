<script lang="ts">
	import Icon from "./Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let branchLabel = $derived(quay.status?.branch ?? quay.activeRepo?.name ?? "");
</script>

<div class="topbar">
	<button class="icon-btn" title="Toggle sidebar" aria-label="Toggle sidebar" onclick={() => quay.toggleSidebar()}>
		<Icon name="chevronRight" class="icon-sm" />
	</button>
	<div class="brand">
		<span class="brand-mark"><span></span><span></span><span></span></span>
		Quay
	</div>
	{#if quay.activeRepo}
		<div class="row g-8">
			<span class="topbar-repo">{quay.activeRepo.name}</span>
			{#if branchLabel}
				<div
					class="branch-pill"
					title="Branch"
					onclick={() => quay.setActiveView("branches")}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.setActiveView("branches")}
					role="button"
					tabindex="0"
				>
					<Icon name="branch" class="icon-sm" />
					{branchLabel}
					{#if quay.status?.ahead}<span style="color:var(--green);margin-left:4px;">↑{quay.status.ahead}</span>{/if}
					{#if quay.status?.behind}<span style="color:var(--red);">↓{quay.status.behind}</span>{/if}
				</div>
			{/if}
		</div>
	{/if}
	<div class="grow"></div>
	<button class="btn btn-sm" onclick={() => (quay.paletteOpen = true)}>
		<Icon name="search" class="icon-sm" />
		Commands
		<span class="kbd">⌘K</span>
	</button>
	<button class="icon-btn" title="Settings" aria-label="Open settings" onclick={() => quay.setActiveView("settings")}>
		<Icon name="settings2" />
	</button>
</div>
