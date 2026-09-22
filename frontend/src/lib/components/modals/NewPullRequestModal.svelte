<script lang="ts">
	import { quay } from "$lib/state/app-state.svelte";

	let base = $state("");
	let head = $state("");
	let title = $state("");
	let body = $state("");
	let draft = $state(false);

	$effect(() => {
		if (quay.newPrModalOpen) {
			const current = quay.branches.find((b) => b.current);
			base = quay.branches.find((b) => b.name !== current?.name)?.name ?? current?.name ?? "";
			head = current?.name ?? "";
			title = "";
			body = "";
			draft = false;
		}
	});

	function toggle(list: string[], value: string): string[] {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}

	async function submit(): Promise<void> {
		if (!title.trim()) {
			quay.toast("Title is required", "info");
			return;
		}
		await quay.submitNewPr({ title, body, base, head, draft });
	}
</script>

<div class="modal-overlay" class:open={quay.newPrModalOpen}>
	<div class="modal wide">
		<div class="modal-head"><h3 class="modal-title">Create pull request</h3></div>
		<div class="modal-body">
			<div class="context-banner">
				<div class="row g-8">
					<span class="mono">{quay.activeRepo?.name ?? ""}</span>
				</div>
				{#if quay.activeAccount}
					<span class="account-badge" style="cursor:default;">
						<span class="account-avatar" style="background:var(--accent-strong);">{quay.activeAccount.login.slice(0, 1).toUpperCase()}</span>
						{quay.activeAccount.login}
					</span>
				{/if}
			</div>
			<div class="row g-8" style="margin-bottom:12px;">
				<div class="field grow" style="margin-bottom:0;">
					<label class="field-label" for="pr-base">Base</label>
					<select id="pr-base" bind:value={base} style="width:100%;background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;padding:7px 8px;">
						{#each quay.branches as b (b.name)}
							<option value={b.name}>{b.name}</option>
						{/each}
					</select>
				</div>
				<div class="field grow" style="margin-bottom:0;">
					<label class="field-label" for="pr-head">Compare</label>
					<select id="pr-head" bind:value={head} style="width:100%;background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;padding:7px 8px;">
						{#each quay.branches as b (b.name)}
							<option value={b.name}>{b.name}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="field">
				<label class="field-label" for="pr-title">Title</label>
				<input id="pr-title" type="text" bind:value={title} />
			</div>
			<div class="field" style="margin-bottom:12px;">
				<label class="field-label" for="pr-body">Description</label>
				<textarea id="pr-body" style="height:70px;" bind:value={body}></textarea>
			</div>
			<label class="row g-8" style="font-size:12.5px;color:var(--text-secondary);cursor:pointer;margin-bottom:14px;">
				<input type="checkbox" style="width:auto;" bind:checked={draft} /> Open as draft
			</label>
			<div class="field">
				<span class="field-label">Reviewers</span>
				<div class="chip-toggle-group">
					{#each quay.prMeta?.collaborators ?? [] as login (login)}
						<div
							class="chip-toggle"
							class:selected={quay.newPrSelection.reviewers.includes(login)}
							onclick={() => (quay.newPrSelection.reviewers = toggle(quay.newPrSelection.reviewers, login))}
							onkeydown={(e) =>
								(e.key === "Enter" || e.key === " ") && (quay.newPrSelection.reviewers = toggle(quay.newPrSelection.reviewers, login))}
							role="button"
							tabindex="0"
						>
							{login}
						</div>
					{/each}
				</div>
			</div>
			<div class="field">
				<span class="field-label">Assignees</span>
				<div class="chip-toggle-group">
					{#each quay.prMeta?.collaborators ?? [] as login (login)}
						<div
							class="chip-toggle"
							class:selected={quay.newPrSelection.assignees.includes(login)}
							onclick={() => (quay.newPrSelection.assignees = toggle(quay.newPrSelection.assignees, login))}
							onkeydown={(e) =>
								(e.key === "Enter" || e.key === " ") && (quay.newPrSelection.assignees = toggle(quay.newPrSelection.assignees, login))}
							role="button"
							tabindex="0"
						>
							{login}
						</div>
					{/each}
				</div>
			</div>
			<div class="field" style="margin-bottom:0;">
				<span class="field-label">Labels</span>
				<div class="chip-toggle-group">
					{#each quay.prMeta?.labels ?? [] as label (label.name)}
						<div
							class="chip-toggle"
							class:selected={quay.newPrSelection.labels.includes(label.name)}
							onclick={() => (quay.newPrSelection.labels = toggle(quay.newPrSelection.labels, label.name))}
							onkeydown={(e) =>
								(e.key === "Enter" || e.key === " ") && (quay.newPrSelection.labels = toggle(quay.newPrSelection.labels, label.name))}
							role="button"
							tabindex="0"
						>
							{label.name}
						</div>
					{/each}
				</div>
			</div>
		</div>
		<div class="modal-foot">
			<button class="btn" onclick={() => quay.closeNewPrModal()}>Cancel</button>
			<button class="btn btn-primary" onclick={submit}>Create pull request</button>
		</div>
	</div>
</div>
