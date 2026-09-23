<script lang="ts">
	import Icon from "./Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let branchLabel = $derived(quay.status?.branch ?? quay.activeRepo?.name ?? "");
	let unreadCount = $derived(quay.notifications.filter((n) => n.unread).length);

	function closeOnOutsideClick(e: MouseEvent): void {
		const target = e.target as HTMLElement;
		if (quay.notifPanelOpen && !target.closest("#notifPanel") && !target.closest("#notifBtn")) {
			quay.closeNotifPanel();
		}
	}
</script>

<svelte:window onclick={closeOnOutsideClick} />

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
	<button
		class="icon-btn notif-btn"
		id="notifBtn"
		title="Notifications"
		aria-label="Notifications"
		onclick={(e) => {
			e.stopPropagation();
			quay.toggleNotifPanel();
		}}
	>
		<Icon name="bell" />
		<span class="notif-badge" class:show={unreadCount > 0}>{unreadCount > 9 ? "9+" : unreadCount}</span>
	</button>
	{#if quay.activeAccount}
		<div
			class="account-badge"
			onclick={() => quay.openAccountModal()}
			onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.openAccountModal()}
			role="button"
			tabindex="0"
		>
			<span class="account-avatar" style="background:var(--accent-strong);">{quay.activeAccount.login.slice(0, 1).toUpperCase()}</span>
			{quay.activeAccount.login}
		</div>
	{/if}
	<button class="icon-btn" title="Settings" aria-label="Open settings" onclick={() => quay.setActiveView("settings")}>
		<Icon name="settings2" />
	</button>
	<div class="notif-panel" id="notifPanel" class:open={quay.notifPanelOpen}>
		<div class="notif-panel-head">
			<span>Notifications</span>
			<span
				class="notif-mark-read"
				onclick={() => quay.markAllNotificationsRead()}
				onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.markAllNotificationsRead()}
				role="button"
				tabindex="0"
			>
				Mark all read
			</span>
		</div>
		{#if quay.notifications.length === 0}
			<div class="notif-empty">You are all caught up</div>
		{:else}
			{#each quay.notifications as notif (notif.id)}
				<div
					class="notif-item"
					class:unread={notif.unread}
					onclick={() => quay.openNotification(notif)}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.openNotification(notif)}
					role="button"
					tabindex="0"
				>
					<span class="dot"></span>
					<div>
						<div class="notif-text">{notif.title}</div>
						<div class="notif-meta">{notif.repo} · {new Date(notif.updatedAt).toLocaleString()}</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
