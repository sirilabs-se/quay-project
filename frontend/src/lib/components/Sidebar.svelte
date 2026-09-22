<script lang="ts">
	import Icon from "./Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let search = $state("");

	let filteredRepos = $derived(
		quay.repositories.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.path.toLowerCase().includes(search.toLowerCase()))
	);

	function addRepository(): void {
		quay.openFormModal({
			title: "Add repository",
			fields: [{ key: "path", label: "Path", type: "text", value: "" }],
			submitLabel: "Add repository",
			onSubmit: async (values) => {
				const path = String(values.path ?? "").trim();
				if (!path) {
					quay.toast("Path is required", "info");
					return;
				}
				try {
					await quay.addRepository(path);
				} catch (err) {
					quay.toast(err instanceof Error ? err.message : "Failed to add repository", "error");
				}
			}
		});
	}
</script>

<div class="sidebar">
	<div class="sidebar-head">
		<div class="sidebar-search">
			<Icon name="search" class="icon-sm" />
			<input type="text" placeholder="Search repositories…" bind:value={search} />
		</div>
	</div>
	<div class="sidebar-scroll">
		<div class="sidebar-section-label"><span>Repositories</span></div>
		<div>
			{#each filteredRepos as repo (repo.id)}
				<div
					class="repo-row"
					class:active={repo.id === quay.activeRepoId}
					onclick={() => quay.selectRepo(repo.id)}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.selectRepo(repo.id)}
					role="button"
					tabindex="0"
				>
					<span class="repo-star" class:filled={repo.favorite}><Icon name="star" class="icon-sm" /></span>
					<div class="repo-meta grow truncate">
						<div class="repo-name truncate">{repo.name}</div>
						<div class="repo-path truncate">{repo.path}</div>
					</div>
				</div>
			{/each}
			{#if filteredRepos.length === 0 && !quay.loadingRepositories}
				<div class="muted" style="padding:10px 7px;font-size:12px;">No repositories yet.</div>
			{/if}
		</div>

		<div class="sidebar-section-label" style="margin-top:14px;"><span>Accounts</span></div>
		<div>
			{#each quay.accounts as account (account.host + account.login)}
				<div
					class="account-row"
					class:active-account={quay.activeAccount?.host === account.host && quay.activeAccount?.login === account.login}
					onclick={() => quay.openAccountModal()}
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.openAccountModal()}
					role="button"
					tabindex="0"
				>
					<span class="dot dot-accent"></span>
					<div class="grow truncate">
						<div class="account-name truncate">{account.login}</div>
						<div class="account-handle truncate">{account.host}</div>
					</div>
					{#if quay.activeAccount?.host === account.host && quay.activeAccount?.login === account.login}
						<Icon name="check" class="icon-sm" />
					{/if}
				</div>
			{/each}
		</div>
	</div>
	<div class="sidebar-foot">
		<button class="btn btn-sm" style="width:100%;justify-content:center;" onclick={addRepository}>
			<Icon name="plus" class="icon-sm" />
			Add repository
		</button>
	</div>
</div>
