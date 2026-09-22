<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay, type FlatFileEntry } from "$lib/state/app-state.svelte";
	import type { DiffLine } from "shared";

	let amend = $state(false);
	let message = $state("");

	let groups = $derived([
		{ label: "Staged" as const, data: quay.status?.staged ?? [], discard: false },
		{ label: "Modified" as const, data: quay.status?.modified ?? [], discard: true },
		{ label: "Untracked" as const, data: quay.status?.untracked ?? [], discard: true }
	]);

	function indexOf(entry: FlatFileEntry): number {
		return quay.flatFiles.findIndex((f) => f.path === entry.path && f.group === entry.group);
	}

	function statusClass(flag: string): string {
		return flag === "?" ? "status-Q" : `status-${flag}`;
	}

	async function toggleAmend(): Promise<void> {
		amend = !amend;
		if (amend && quay.status?.lastCommit) {
			message = quay.status.lastCommit.message;
		} else {
			message = "";
		}
	}

	async function doCommit(push: boolean): Promise<void> {
		const finalMessage = message.trim() || quay.status?.lastCommit?.message || "";
		if (!finalMessage) {
			quay.toast("A commit message is required", "info");
			return;
		}
		await quay.commitChanges(finalMessage, amend, push);
		message = "";
		amend = false;
	}

	function discard(entry: FlatFileEntry): void {
		const name = entry.path.split("/").pop() ?? entry.path;
		const body =
			entry.group === "Untracked"
				? "Deletes this untracked file from disk. This can't be undone."
				: "Reverts this file to its last committed state, discarding all local edits. This can't be undone.";
		quay.openConfirm(`Discard changes to ${name}?`, body, () => quay.discardFile(entry));
	}

	function lineNumber(n: number | null): string {
		return n === null ? "" : String(n);
	}

	function lineClass(line: DiffLine): string {
		return line.type === "add" ? "diff-add" : line.type === "del" ? "diff-del" : "";
	}

	function lineMarker(line: DiffLine): string {
		return line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
	}
</script>

<div class="view-split active">
	<div class="changes-side">
		<div class="changes-files">
			{#if quay.flatFiles.length === 0}
				<div class="empty-diff" style="height:200px;">
					<Icon name="check" class="icon-lg" />
					<span>Working tree clean</span>
				</div>
			{:else}
				{#each groups as group (group.label)}
					{#if group.data.length > 0}
						<div class="file-group-label"><span>{group.label}</span><span>{group.data.length}</span></div>
						{#each group.data as file (file.path)}
							{@const entry = { path: file.path, flag: file.flag, group: group.label }}
							{@const idx = indexOf(entry)}
							<div
								class="file-row"
								class:selected={idx === quay.selectedFileIdx}
								onclick={() => quay.selectFile(idx)}
								onkeydown={(e) => (e.key === "Enter" || e.key === " ") && quay.selectFile(idx)}
								role="button"
								tabindex="0"
							>
								<span
									class="checkbox"
									class:checked={group.label === "Staged"}
									onclick={(e) => {
										e.stopPropagation();
										quay.toggleStaged(entry);
									}}
									onkeydown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation();
											e.preventDefault();
											quay.toggleStaged(entry);
										}
									}}
									role="checkbox"
									aria-checked={group.label === "Staged"}
									tabindex="0"
								>
									{#if group.label === "Staged"}<Icon name="check" class="icon-sm" />{/if}
								</span>
								<span class="status-flag {statusClass(file.flag)}">{file.flag}</span>
								<span class="file-path">{file.path.split("/").pop()}</span>
								{#if group.discard}
									<span class="file-row-actions">
										<button
											class="icon-btn btn-sm"
											title="Discard changes"
											onclick={(e) => {
												e.stopPropagation();
												discard(entry);
											}}
										>
											<Icon name="trash" class="icon-sm" />
										</button>
									</span>
								{/if}
							</div>
						{/each}
					{/if}
				{/each}
			{/if}
		</div>
		<div class="commit-box">
			<div class="commit-identity">
				{quay.status?.lastCommit ? `Committing to ${quay.status.branch ?? "HEAD"}` : ""}
			</div>
			<label class="row g-8" style="font-size:11.5px;color:var(--text-secondary);cursor:pointer;margin-bottom:8px;">
				<input type="checkbox" style="width:auto;" checked={amend} onchange={toggleAmend} /> Amend previous commit
			</label>
			<textarea placeholder="Describe what changed…" bind:value={message}></textarea>
			<div class="row g-8">
				<button class="btn grow" onclick={() => doCommit(false)}>{amend ? "Amend commit" : "Commit"}</button>
				<button class="btn btn-primary grow" onclick={() => doCommit(true)}>Commit &amp; push</button>
			</div>
		</div>
	</div>
	<div class="diff-pane">
		<div class="diff-toolbar">
			<div class="row g-10" style="min-width:0;">
				<span class="diff-file-title truncate">{quay.flatFiles[quay.selectedFileIdx]?.path ?? "Select a file to view its diff"}</span>
			</div>
			<div class="segmented">
				<button class:active={quay.diffMode === "unified"} onclick={() => (quay.diffMode = "unified")}>Unified</button>
				<button class:active={quay.diffMode === "split"} onclick={() => (quay.diffMode = "split")}>Side-by-side</button>
			</div>
		</div>
		<div class="diff-body">
			{#if quay.diffLoading}
				<div class="empty-diff"><span>Loading diff…</span></div>
			{:else if !quay.currentDiff || quay.currentDiff.hunks.length === 0}
				<div class="empty-diff">
					<Icon name="branch" class="icon-lg" />
					<span>{quay.currentDiff?.binary ? "Binary file" : "No file selected"}</span>
				</div>
			{:else if quay.diffMode === "split"}
				{#each quay.currentDiff.hunks as hunk, hi (hi)}
					<div class="diff-hunk"><span>{hunk.header}</span></div>
					<div class="diff-split-row">
						<div class="diff-split-col">
							{#each hunk.lines.filter((l) => l.type !== "add") as line, li (li)}
								<div class="diff-line {line.type === 'del' ? 'diff-del' : ''}">
									<span class="diff-ln">{lineNumber(line.oldLine)}</span><span class="diff-ln">{lineNumber(line.newLine)}</span>
									<span class="diff-content">{lineMarker(line)} {line.text}</span>
								</div>
							{/each}
						</div>
						<div class="diff-split-col">
							{#each hunk.lines.filter((l) => l.type !== "del") as line, li (li)}
								<div class="diff-line {line.type === 'add' ? 'diff-add' : ''}">
									<span class="diff-ln">{lineNumber(line.oldLine)}</span><span class="diff-ln">{lineNumber(line.newLine)}</span>
									<span class="diff-content">{lineMarker(line)} {line.text}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{:else}
				{#each quay.currentDiff.hunks as hunk, hi (hi)}
					<div class="diff-hunk"><span>{hunk.header}</span></div>
					{#each hunk.lines as line, li (li)}
						<div class="diff-line {lineClass(line)}">
							<span class="diff-ln">{lineNumber(line.oldLine)}</span><span class="diff-ln">{lineNumber(line.newLine)}</span>
							<span class="diff-content">{lineMarker(line)} {line.text}</span>
						</div>
					{/each}
				{/each}
			{/if}
		</div>
	</div>
</div>
