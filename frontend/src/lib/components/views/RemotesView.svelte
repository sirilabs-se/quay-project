<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	function openAddRemoteModal(): void {
		quay.openFormModal({
			title: "Add remote",
			fields: [
				{ key: "name", label: "Name", type: "text", value: "" },
				{ key: "url", label: "URL", type: "text", value: "" }
			],
			submitLabel: "Add remote",
			onSubmit: async (values) => {
				const name = String(values.name ?? "").trim();
				const url = String(values.url ?? "").trim();
				if (!name || !url) {
					quay.toast("Name and URL are required", "info");
					return;
				}
				await quay.addRemote(name, url);
			}
		});
	}
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="section-title" style="margin:0;">Remotes</div>
		<button class="btn btn-sm" onclick={openAddRemoteModal}><Icon name="plus" class="icon-sm" /> Add remote</button>
	</div>
	<div class="panel">
		<table class="datatable">
			<thead>
				<tr>
					<th>Name</th>
					<th>Fetch URL</th>
					<th>Push URL</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each quay.remotes as remote (remote.name)}
					<tr>
						<td class="mono">{remote.name}</td>
						<td class="mono muted">{remote.fetchUrl}</td>
						<td class="mono muted">{remote.pushUrl}</td>
						<td>
							<button class="btn btn-sm" onclick={() => quay.runRemoteAction("fetch")}>
								<Icon name="refresh" class="icon-sm" /> Fetch
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
