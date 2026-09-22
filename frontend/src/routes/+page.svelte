<script lang="ts">
	import { onMount } from "svelte";
	import type { DetectionResponse } from "shared";
	import { apiFetch, ApiError } from "$lib/api/client";

	let detection = $state<DetectionResponse | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			detection = await apiFetch<DetectionResponse>("/api/detection");
		} catch (err) {
			error = err instanceof ApiError ? err.message : "Failed to reach the Quay backend.";
		} finally {
			loading = false;
		}
	});
</script>

<main>
	<h1>Quay</h1>
	<h2>Environment</h2>

	{#if loading}
		<p>Checking git and gh…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if detection}
		<ul>
			<li>
				<strong>git</strong>
				{#if detection.git.installed}
					✓ Installed — {detection.git.version}
				{:else}
					✗ Not found
				{/if}
			</li>
			<li>
				<strong>gh</strong>
				{#if detection.gh.installed}
					✓ Installed — {detection.gh.version}
				{:else}
					✗ Not found
				{/if}
			</li>
		</ul>
	{/if}
</main>

<style>
	.error {
		color: #b91c1c;
	}
</style>
