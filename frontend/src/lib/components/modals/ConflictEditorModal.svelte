<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let allResolved = $derived(quay.mergeConflictFileSet.length > 0 && quay.resolvedConflictFiles.length === quay.mergeConflictFileSet.length);

	async function selectFile(path: string): Promise<void> {
		quay.activeConflictFile = path;
		await quay.loadConflictSides(path);
	}

	function acceptOurs(): void {
		if (quay.conflictSides) quay.mergedText = quay.conflictSides.ours;
	}

	function acceptTheirs(): void {
		if (quay.conflictSides) quay.mergedText = quay.conflictSides.theirs;
	}
</script>

<div class="modal-overlay" class:open={quay.conflictModalOpen}>
	<div class="modal wide">
		<div class="modal-head"><h3 class="modal-title">Resolve conflict</h3></div>
		<div class="modal-body">
			<div class="row g-8 wrap" style="margin-bottom:14px;">
				{#each quay.mergeConflictFileSet as path (path)}
					{@const resolved = quay.resolvedConflictFiles.includes(path)}
					<div
						class="filter-chip"
						class:active={path === quay.activeConflictFile}
						onclick={() => selectFile(path)}
						onkeydown={(e) => (e.key === "Enter" || e.key === " ") && selectFile(path)}
						role="button"
						tabindex="0"
					>
						{#if resolved}<Icon name="check" class="icon-sm" />{/if}
						{path.split("/").pop()}
					</div>
				{/each}
			</div>
			{#if quay.conflictSides && quay.activeConflictFile}
				<div class="conflict-pane-label">Ours ({quay.status?.branch ?? "current branch"})</div>
				<div class="conflict-pane ours">{quay.conflictSides.ours}</div>
				<div class="conflict-pane-label">Theirs</div>
				<div class="conflict-pane theirs">{quay.conflictSides.theirs}</div>
				<div class="conflict-pane-label">Merged result</div>
				<textarea class="conflict-merged" bind:value={quay.mergedText}></textarea>
				<div class="row g-8" style="margin-top:10px;">
					<button class="btn btn-sm" onclick={acceptOurs}>Accept ours</button>
					<button class="btn btn-sm" onclick={acceptTheirs}>Accept theirs</button>
					<button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick={() => quay.markConflictResolved()}>
						{quay.resolvedConflictFiles.includes(quay.activeConflictFile) ? "Resolved" : "Mark resolved"}
					</button>
				</div>
			{/if}
		</div>
		<div class="modal-foot">
			<button
				class="btn btn-danger"
				style="margin-right:auto;"
				onclick={() =>
					quay.openConfirm(
						`Abort ${quay.inRebase ? "rebase" : "merge"}?`,
						`Resets the working tree to its pre-${quay.inRebase ? "rebase" : "merge"} state and discards all conflict resolutions made so far.`,
						() => (quay.inRebase ? quay.abortRebase() : quay.abortMerge())
					)}
			>
				Abort {quay.inRebase ? "rebase" : "merge"}
			</button>
			<button class="btn" onclick={() => quay.closeConflictModal()}>Close</button>
			<button class="btn btn-primary" disabled={!allResolved} onclick={() => quay.continueMergeOrRebase()}>
				Continue {quay.inRebase ? "rebase" : "merge"}
			</button>
		</div>
	</div>
</div>
