<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";
</script>

<div class="modal-overlay" class:open={quay.browseModalOpen}>
	<div class="modal wide">
		<div class="modal-head"><h3 class="modal-title">Add repository</h3></div>
		<div class="modal-body">
			<div class="row g-8" style="margin-bottom:10px;">
				<button class="icon-btn" title="Up a level" aria-label="Up a level" disabled={!quay.browseResult?.parent} onclick={() => quay.browseUp()}>
					<Icon name="up" class="icon-sm" />
				</button>
				<input
					type="text"
					bind:value={quay.browsePathInput}
					onkeydown={(e) => e.key === "Enter" && quay.browseTo(quay.browsePathInput)}
					placeholder="/home/you/code/some-repo"
				/>
				<button class="btn btn-sm" onclick={() => quay.browseTo(quay.browsePathInput)}>Go</button>
			</div>

			{#if quay.browseLoading}
				<div class="muted" style="padding:20px;text-align:center;">Loading…</div>
			{:else if quay.browseError}
				<div class="warn-banner"><Icon name="bolt" /><div>{quay.browseError}</div></div>
			{:else if quay.browseResult}
				<div class="panel" style="max-height:320px;overflow-y:auto;">
					{#each quay.browseResult.entries as entry (entry.path)}
						<div class="repo-row" style="border-radius:0;">
							<span class="repo-star"><Icon name="folder" class="icon-sm" /></span>
							<div
								class="repo-meta grow truncate"
								style="cursor:pointer;"
								onclick={() => quay.browseTo(entry.path)}
								onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.browseTo(entry.path)}
								role="button"
								tabindex="0"
							>
								<div class="repo-name truncate">{entry.name}</div>
							</div>
							{#if entry.isGitRepo}
								<span class="badge badge-accent" style="margin-right:8px;">git repo</span>
								<button class="btn btn-sm" onclick={() => quay.addRepositoryFromBrowser(entry.path)}>Add</button>
							{/if}
						</div>
					{/each}
					{#if quay.browseResult.entries.length === 0}
						<div class="muted" style="padding:16px;text-align:center;font-size:12px;">No subdirectories here.</div>
					{/if}
				</div>
			{/if}
		</div>
		<div class="modal-foot">
			<button class="btn" onclick={() => quay.closeBrowseModal()}>Cancel</button>
			<button
				class="btn btn-primary"
				disabled={!quay.browseResult}
				onclick={() => quay.browseResult && quay.addRepositoryFromBrowser(quay.browseResult.path)}
			>
				Add this folder
			</button>
		</div>
	</div>
</div>
