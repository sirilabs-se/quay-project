<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	function openStashModal(): void {
		quay.openFormModal({
			title: "Stash changes",
			fields: [{ key: "message", label: "Message (optional)", type: "text", value: "" }],
			submitLabel: "Stash",
			onSubmit: (values) => quay.saveStash(String(values.message ?? ""))
		});
	}
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="section-title" style="margin:0;">Stashes</div>
		<button class="btn btn-sm" onclick={openStashModal}><Icon name="plus" class="icon-sm" /> Stash changes</button>
	</div>
	{#if quay.stashes.length === 0}
		<div class="panel panel-pad" style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
			<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">No stashes</div>
			<div style="font-size:12.5px;">Stash your working changes to set them aside without committing.</div>
		</div>
	{:else}
		<div class="panel">
			<table class="datatable">
				<thead>
					<tr>
						<th>Message</th>
						<th>Branch</th>
						<th>Created</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each quay.stashes as stash (stash.index)}
						<tr>
							<td>{stash.message}</td>
							<td class="mono muted">{stash.branch}</td>
							<td class="muted">{stash.date}</td>
							<td>
								<div class="row g-6">
									<button class="btn btn-sm" onclick={() => quay.applyStash(stash.index)}>Apply</button>
									<button class="btn btn-sm" onclick={() => quay.popStash(stash.index)}>Pop</button>
									<button
										class="icon-btn btn-sm"
										title="Drop"
										onclick={() =>
											quay.openConfirm("Drop this stash?", "Permanently removes it. This can't be undone.", () =>
												quay.dropStash(stash.index)
											)}
									>
										<Icon name="trash" class="icon-sm" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
