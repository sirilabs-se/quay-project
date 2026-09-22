<script lang="ts">
	import { quay } from "$lib/state/app-state.svelte";
</script>

<div class="toast-stack">
	{#each quay.toasts as toast (toast.id)}
		<div class="toast {toast.kind}">
			<span class="dot"></span>
			<span>{toast.text}</span>
		</div>
	{/each}
</div>
