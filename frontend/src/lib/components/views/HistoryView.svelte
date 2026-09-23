<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let detail = $derived(quay.selectedCommitDetail);

	function copySha(sha: string): void {
		navigator.clipboard?.writeText(sha).catch(() => undefined);
		quay.toast(`Copied ${sha.slice(0, 7)}`, "success");
	}

	function resetToHere(sha: string): void {
		quay.openConfirm(
			`Reset ${quay.status?.branch ?? "current branch"} to ${sha.slice(0, 7)}?`,
			"This moves the current branch to this commit and discards any uncommitted changes. Commits after it stay in your reflog for a while but are no longer reachable from the branch. This can't be undone from Quay.",
			() => quay.resetToCommit(sha)
		);
	}
</script>

<div class="view-split active">
	<div class="history-list">
		{#each quay.history as commit (commit.sha)}
			<div
				class="history-row"
				class:selected={commit.sha === quay.selectedCommitSha}
				onclick={() => quay.selectCommit(commit.sha)}
				onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.selectCommit(commit.sha)}
				role="button"
				tabindex="0"
			>
				<div class="lane"><span class="node" style="background:var(--accent-strong);"></span></div>
				<div class="grow truncate">
					<div class="history-msg truncate">{commit.message}</div>
					<div class="history-meta">
						<span class="commit-sha">{commit.sha.slice(0, 7)}</span> · {commit.author} · {new Date(commit.date).toLocaleString()}
					</div>
				</div>
			</div>
		{/each}
	</div>
	<div class="history-detail">
		{#if detail}
			<div class="section-title" style="margin-bottom:4px;">{detail.message}</div>
			<div class="muted" style="font-size:12px;margin-bottom:16px;">
				<span class="commit-sha">{detail.sha.slice(0, 7)}</span> · {detail.author} · {new Date(detail.date).toLocaleString()}
			</div>
			{#if detail.body}<p style="max-width:65ch;">{detail.body}</p>{/if}
			<div class="divider"></div>
			<div class="section-title">Changed files</div>
			{#each detail.files as file (file.path)}
				<div class="commit-line" style="padding:6px 0;">
					<span class="status-flag status-{file.flag === '?' ? 'Q' : file.flag}">{file.flag}</span>
					<span class="mono" style="font-size:12.3px;">{file.path}</span>
				</div>
			{/each}
			<div class="divider"></div>
			<div class="row g-8 wrap">
				<button class="btn btn-sm" onclick={() => copySha(detail.sha)}><Icon name="copy" class="icon-sm" /> Copy SHA</button>
				<button class="btn btn-sm btn-danger" onclick={() => resetToHere(detail.sha)}>Reset to here</button>
			</div>
		{:else}
			<div class="muted">Select a commit.</div>
		{/if}
	</div>
</div>
