<script lang="ts">
	import Icon from "./Icon.svelte";
	import type { IconName } from "$lib/icons";
	import { quay } from "$lib/state/app-state.svelte";

	interface PaletteCommand {
		label: string;
		icon: IconName;
		action: () => void | Promise<void>;
	}

	let query = $state("");
	let activeIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	const commands: PaletteCommand[] = [
		{ label: "Create branch", icon: "branch", action: () => quay.setActiveView("branches") },
		{ label: "Checkout branch", icon: "branch", action: () => quay.setActiveView("branches") },
		{ label: "Fetch", icon: "refresh", action: () => quay.runRemoteAction("fetch") },
		{ label: "Pull", icon: "down", action: () => quay.runRemoteAction("pull") },
		{ label: "Push", icon: "up", action: () => quay.runRemoteAction("push") },
		{ label: "Commit", icon: "commit", action: () => quay.setActiveView("changes") },
		{ label: "View pull requests", icon: "pr", action: () => quay.setActiveView("prs") },
		{ label: "View issues", icon: "issue", action: () => quay.setActiveView("issues") },
		{ label: "View Actions", icon: "play", action: () => quay.setActiveView("actions") },
		{ label: "Open terminal", icon: "terminal", action: () => quay.toggleConsole(true) },
		{ label: "Refresh", icon: "refreshRepo", action: () => quay.refreshActiveView() },
		{ label: "Open settings", icon: "settings2", action: () => quay.setActiveView("settings") }
	];

	let matches = $derived(commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())));

	$effect(() => {
		if (quay.paletteOpen) {
			query = "";
			activeIndex = 0;
			setTimeout(() => inputEl?.focus(), 10);
		}
	});

	function close(): void {
		quay.paletteOpen = false;
	}

	async function run(cmd: PaletteCommand): Promise<void> {
		close();
		await cmd.action();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			close();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, matches.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === "Enter" && matches[activeIndex]) {
			void run(matches[activeIndex]);
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
			e.preventDefault();
			quay.paletteOpen = !quay.paletteOpen;
		}
	}}
/>

<div class="overlay" class:open={quay.paletteOpen} onclick={(e) => e.target === e.currentTarget && close()} role="presentation">
	<div class="palette">
		<div class="palette-input-row">
			<Icon name="search" />
			<input
				type="text"
				placeholder="Type a command…"
				autocomplete="off"
				bind:this={inputEl}
				bind:value={query}
				oninput={() => (activeIndex = 0)}
				onkeydown={onKeydown}
			/>
			<span class="kbd">Esc</span>
		</div>
		<div class="palette-list">
			{#if matches.length === 0}
				<div class="palette-empty">No matching commands</div>
			{:else}
				{#each matches as cmd, i (cmd.label)}
					<div
						class="palette-item"
						class:active={i === activeIndex}
						onmouseenter={() => (activeIndex = i)}
						onclick={() => run(cmd)}
						onkeydown={(e) => (e.key === "Enter" || e.key === " ") && run(cmd)}
						role="button"
						tabindex="0"
					>
						<Icon name={cmd.icon} class="icon-sm" />
						<span>{cmd.label}</span>
						{#if i === activeIndex}<span class="palette-hint">Enter</span>{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
