<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	function openNewTagModal(): void {
		quay.openFormModal({
			title: "New tag",
			fields: [
				{ key: "name", label: "Tag name", type: "text", value: "" },
				{ key: "ref", label: "Commit", type: "select", value: quay.history[0]?.sha ?? "HEAD", options: quay.history.map((c) => c.sha) }
			],
			submitLabel: "Create tag",
			onSubmit: async (values) => {
				const name = String(values.name ?? "").trim();
				if (!name) {
					quay.toast("Tag name is required", "info");
					return;
				}
				await quay.createTag(name, String(values.ref ?? "HEAD"));
			}
		});
	}
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="section-title" style="margin:0;">Tags</div>
		<button class="btn btn-sm" onclick={openNewTagModal}><Icon name="plus" class="icon-sm" /> New tag</button>
	</div>
	<div class="panel">
		<table class="datatable">
			<thead>
				<tr>
					<th>Name</th>
					<th>Commit</th>
					<th>Date</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each quay.tags as tag (tag.name)}
					<tr>
						<td class="mono">{tag.name}</td>
						<td class="commit-sha">{tag.sha}</td>
						<td class="muted">{new Date(tag.date).toLocaleDateString()}</td>
						<td>
							<div class="row g-6">
								<button class="btn btn-sm" onclick={() => quay.checkoutBranch(tag.name)}>Checkout</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
