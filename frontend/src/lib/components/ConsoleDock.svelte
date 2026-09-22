<script lang="ts">
	import Icon from "./Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let input = $state("");
	let bodyEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		void quay.consoleLines.length;
		if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
	});

	async function runCommand(): Promise<void> {
		const cmd = input.trim();
		if (!cmd) return;
		input = "";
		const [bin] = cmd.split(/\s+/);
		if (bin !== "git" && bin !== "gh") {
			quay.consoleLog(cmd, [`Only git and gh commands can be run here.`], true);
			return;
		}
		quay.consoleLog(cmd, ["Running in the repository status/branches/history panels — direct console execution lands in a later phase."]);
	}
</script>

<div class="console-dock" class:expanded={quay.consoleExpanded}>
	<div
		class="console-head"
		onclick={() => quay.toggleConsole()}
		onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.toggleConsole()}
		role="button"
		tabindex="0"
	>
		<div class="console-head-left">
			<Icon name="terminal" class="icon-sm" />
			Console
			<span class="console-cwd">{quay.activeRepo?.path ?? ""}</span>
		</div>
		<div class="row g-6">
			<button
				class="icon-btn btn-sm"
				title="Clear output"
				aria-label="Clear console output"
				onclick={(e) => {
					e.stopPropagation();
					quay.consoleLines = [];
				}}
			>
				<Icon name="trash" class="icon-sm" />
			</button>
			<svg
				class="icon"
				viewBox="0 0 24 24"
				style="transition:transform .15s ease;transform:rotate({quay.consoleExpanded ? 180 : 0}deg);"
				><polyline points="6 9 12 15 18 9"></polyline></svg
			>
		</div>
	</div>
	<div class="console-body" bind:this={bodyEl}>
		{#each quay.consoleLines as line, i (i)}
			{#if line.kind === "cmd"}
				<div class="console-line"><span class="console-prompt">❯ </span><span class="console-cmd">{line.text}</span></div>
			{:else}
				<div class="console-line {line.kind === 'err' ? 'console-out-err' : 'console-out'}">{line.text}</div>
			{/if}
		{/each}
	</div>
	<div class="console-input-row">
		<span class="console-prompt">❯</span>
		<input
			type="text"
			placeholder="Type a git or gh command…"
			autocomplete="off"
			bind:value={input}
			onkeydown={(e) => {
				if (e.key === "Enter") void runCommand();
			}}
		/>
	</div>
</div>
