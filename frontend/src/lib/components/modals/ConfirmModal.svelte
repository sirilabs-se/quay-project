<script lang="ts">
	import { quay } from "$lib/state/app-state.svelte";

	async function confirm(): Promise<void> {
		if (!quay.confirmModal) return;
		const modal = quay.confirmModal;
		quay.closeConfirm();
		await modal.onConfirm();
	}
</script>

<div class="modal-overlay" class:open={quay.confirmModal !== null}>
	{#if quay.confirmModal}
		<div class="modal">
			<div class="modal-head"><h3 class="modal-title">{quay.confirmModal.title}</h3></div>
			<div class="modal-body">
				<div class="destructive-summary">{quay.confirmModal.body}</div>
			</div>
			<div class="modal-foot">
				<button class="btn" onclick={() => quay.closeConfirm()}>Cancel</button>
				<button class="btn btn-danger" onclick={confirm}>Confirm</button>
			</div>
		</div>
	{/if}
</div>
