<script lang="ts">
	import Icon from "./Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let search = $state("");

	// Repos with a definitively-resolved account belonging to someone else are
	// hidden; repos with no remote or an ambiguous account (shared host, no
	// single match) stay visible — we can't safely hide what we're not sure
	// about, and always-automatic filtering was the explicit choice here.
	let accountFilteredRepos = $derived(
		quay.repositories.filter((r) => !r.accountLogin || !quay.activeAccount || r.accountLogin === quay.activeAccount.login)
	);

	let filteredRepos = $derived(
		accountFilteredRepos.filter(
			(r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.path.toLowerCase().includes(search.toLowerCase())
		)
	);

	function addRepository(): void {
		void quay.openBrowseModal();
	}

	function openOnGitHub(url: string): void {
		window.open(url, "_blank", "noopener,noreferrer");
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

		{#if quay.remoteRepos.length > 0}
			<div class="sidebar-section-label" style="margin-top:14px;"><span>On GitHub</span></div>
			<div>
				{#each quay.remoteRepos as repo (repo.nameWithOwner)}
					<div class="repo-row" style="cursor:default;">
						<span class="repo-star" title={repo.isPrivate ? "Private" : "Public"}>
							<Icon name={repo.isPrivate ? "lock" : "folder"} class="icon-sm" />
						</span>
						<div class="repo-meta grow truncate">
							<div class="repo-name truncate">{repo.name}</div>
							<div class="repo-path truncate">{repo.nameWithOwner}</div>
						</div>
						<button class="icon-btn" title="Open on GitHub" aria-label="Open on GitHub" onclick={() => openOnGitHub(repo.url)}>
							<Icon name="ext" class="icon-sm" />
						</button>
					</div>
				{/each}
			</div>
		{/if}

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
