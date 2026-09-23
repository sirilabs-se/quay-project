<script lang="ts">
	import "$lib/styles/quay.css";
	import favicon from "$lib/assets/favicon.svg";
	import { quay } from "$lib/state/app-state.svelte";

	let { children } = $props();

	$effect(() => {
		const setting = quay.settings?.theme ?? "system";

		function apply(): void {
			const effective = setting === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : setting;
			document.documentElement.dataset.theme = effective;
		}
		apply();

		if (setting === "system") {
			const media = window.matchMedia("(prefers-color-scheme: light)");
			media.addEventListener("change", apply);
			return () => media.removeEventListener("change", apply);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>Quay — a local command center for Git &amp; GitHub</title>
</svelte:head>

{@render children()}
