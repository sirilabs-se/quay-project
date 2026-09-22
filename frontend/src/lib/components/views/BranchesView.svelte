<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	function openNewBranchModal(): void {
		const base = quay.status?.branch ?? quay.branches.find((b) => b.current)?.name ?? "main";
		quay.openFormModal({
			title: "New branch",
			fields: [
				{ key: "name", label: "Branch name", type: "text", value: "" },
				{ key: "base", label: "Based on", type: "select", value: base, options: quay.branches.map((b) => b.name) },
				{ key: "checkout", label: "Checkout after creating", type: "checkbox", value: true }
			],
			submitLabel: "Create branch",
			onSubmit: async (values) => {
				const name = String(values.name ?? "").trim();
				if (!name) {
					quay.toast("Branch name is required", "info");
					return;
				}
				await quay.createBranch(name, String(values.base ?? base), Boolean(values.checkout));
			}
		});
	}

	async function merge(name: string): Promise<void> {
		try {
			const result = await quay.mergeBranch(name);
			if (result.conflicts.length > 0) {
				await quay.setActiveView("changes");
			}
		} catch (err) {
			quay.toast(err instanceof Error ? err.message : "Merge failed", "error");
		}
	}

	async function rebase(name: string): Promise<void> {
		try {
			const result = await quay.rebaseBranch(name);
			if (result.conflicts.length > 0) {
				await quay.setActiveView("changes");
			}
		} catch (err) {
			quay.toast(err instanceof Error ? err.message : "Rebase failed", "error");
		}
	}

	function deleteBranch(name: string): void {
		quay.openConfirm(
			`Delete branch '${name}'?`,
			"This deletes the local branch. If it hasn't been merged, its commits become unreachable once garbage collected. This can't be undone from Quay.",
			() => quay.deleteBranch(name, false)
		);
	}
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="section-title" style="margin:0;">Branches</div>
		<button class="btn btn-primary btn-sm" onclick={openNewBranchModal}><Icon name="plus" class="icon-sm" /> New branch</button>
	</div>
	<div class="panel">
		<table class="datatable">
			<thead>
				<tr>
					<th>Name</th>
					<th>Tracking</th>
					<th>Ahead / behind</th>
					<th>Last activity</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each quay.branches as b (b.name)}
					<tr class:current-row={b.current}>
						<td class="mono">
							{#if b.current}
								<strong><Icon name="branch" class="icon-sm" /> {b.name}</strong>
								<span class="badge badge-accent" style="margin-left:6px;">current</span>
							{:else}
								<Icon name="branch" class="icon-sm" /> {b.name}
							{/if}
						</td>
						<td class="mono muted">{b.tracking ?? "—"}</td>
						<td class="mono">
							{#if b.ahead}<span style="color:var(--green);">↑{b.ahead}</span>{/if}
							{#if b.behind}<span style="color:var(--red);">↓{b.behind}</span>{/if}
							{#if !b.ahead && !b.behind}<span class="muted">—</span>{/if}
						</td>
						<td class="muted">{b.lastCommitDate ? new Date(b.lastCommitDate).toLocaleDateString() : "—"}</td>
						<td>
							{#if b.current}
								<span class="muted" style="font-size:11.5px;">—</span>
							{:else}
								<div class="row g-6">
									<button class="btn btn-sm" onclick={() => quay.checkoutBranch(b.name)}>Checkout</button>
									<button class="btn btn-sm" onclick={() => merge(b.name)}>Merge into current</button>
									<button class="btn btn-sm" onclick={() => rebase(b.name)}>Rebase current onto this</button>
									<button class="icon-btn btn-sm" title="Delete branch" onclick={() => deleteBranch(b.name)}>
										<Icon name="trash" class="icon-sm" />
									</button>
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
