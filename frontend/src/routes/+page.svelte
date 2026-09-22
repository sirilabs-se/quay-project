<script lang="ts">
	import { onMount } from "svelte";
	import Topbar from "$lib/components/Topbar.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import Subnav from "$lib/components/Subnav.svelte";
	import ConsoleDock from "$lib/components/ConsoleDock.svelte";
	import CommandPalette from "$lib/components/CommandPalette.svelte";
	import ToastStack from "$lib/components/ToastStack.svelte";
	import FormModal from "$lib/components/modals/FormModal.svelte";
	import ConfirmModal from "$lib/components/modals/ConfirmModal.svelte";
	import AccountSwitchModal from "$lib/components/modals/AccountSwitchModal.svelte";
	import OverviewView from "$lib/components/views/OverviewView.svelte";
	import ChangesView from "$lib/components/views/ChangesView.svelte";
	import BranchesView from "$lib/components/views/BranchesView.svelte";
	import HistoryView from "$lib/components/views/HistoryView.svelte";
	import StashesView from "$lib/components/views/StashesView.svelte";
	import TagsView from "$lib/components/views/TagsView.svelte";
	import RemotesView from "$lib/components/views/RemotesView.svelte";
	import SettingsView from "$lib/components/views/SettingsView.svelte";
	import PlaceholderView from "$lib/components/views/PlaceholderView.svelte";
	import PullRequestsView from "$lib/components/views/PullRequestsView.svelte";
	import PullRequestDetailView from "$lib/components/views/PullRequestDetailView.svelte";
	import NewPullRequestModal from "$lib/components/modals/NewPullRequestModal.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let initError = $state<string | null>(null);

	onMount(() => {
		quay.init().catch((err) => {
			initError = err instanceof Error ? err.message : "Failed to start Quay";
		});
	});
</script>

<div class="shell" class:sidebar-collapsed={quay.sidebarCollapsed}>
	<Topbar />
	<Sidebar />
	<div class="main-col">
		<Subnav />
		<div class="view-scroll">
			{#if initError}
				<div class="view active"><div class="warn-banner">{initError}</div></div>
			{:else if quay.activeView === "overview"}
				<OverviewView />
			{:else if quay.activeView === "changes"}
				<ChangesView />
			{:else if quay.activeView === "branches"}
				<BranchesView />
			{:else if quay.activeView === "history"}
				<HistoryView />
			{:else if quay.activeView === "stashes"}
				<StashesView />
			{:else if quay.activeView === "tags"}
				<TagsView />
			{:else if quay.activeView === "remotes"}
				<RemotesView />
			{:else if quay.activeView === "settings"}
				<SettingsView />
			{:else if quay.activeView === "prs"}
				<PullRequestsView />
			{:else if quay.activeView === "pr-detail"}
				<PullRequestDetailView />
			{:else if quay.activeView === "issues"}
				<PlaceholderView title="No issues here" subtitle="GitHub issue support is coming in a later phase." />
			{:else if quay.activeView === "actions"}
				<PlaceholderView title="No workflow runs here" subtitle="GitHub Actions support is coming in a later phase." />
			{:else if quay.activeView === "releases"}
				<PlaceholderView title="No releases here" subtitle="GitHub release support is coming in a later phase." />
			{/if}
		</div>
		<ConsoleDock />
	</div>
</div>

<CommandPalette />
<FormModal />
<ConfirmModal />
<AccountSwitchModal />
<NewPullRequestModal />
<ToastStack />
