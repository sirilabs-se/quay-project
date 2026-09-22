<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";
</script>

<div class="view active">
	<div class="section-title">Workflow runs</div>
	{#if quay.actionsLoadError}
		<div class="warn-banner"><Icon name="bolt" /><div>{quay.actionsLoadError}</div></div>
	{:else if quay.workflowRuns.length === 0}
		<div class="panel panel-pad" style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
			<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">No workflow runs</div>
			<div style="font-size:12.5px;">Nothing has run yet for this repository.</div>
		</div>
	{:else}
		{#each quay.workflowRuns as run (run.id)}
			<div class="item-row">
				<span class="item-icon"><Icon name="play" /></span>
				<div class="grow">
					<div class="item-title">{run.name}</div>
					<div class="item-sub">
						{#if run.status === "pass"}
							<span class="badge badge-green"><Icon name="check" class="icon-sm" /> Passed</span>
						{:else if run.status === "fail"}
							<span class="badge badge-red"><Icon name="x" class="icon-sm" /> Failed</span>
						{:else}
							<span class="badge badge-amber"><Icon name="clock" class="icon-sm" /> Running</span>
						{/if}
						<span class="mono">{run.branch}</span> · <span class="commit-sha">{run.sha.slice(0, 7)}</span> · {new Date(
							run.updatedAt
						).toLocaleString()}
					</div>
				</div>
				<button class="icon-btn btn-sm" title="Re-run" onclick={() => quay.rerunWorkflow(run.id)}>
					<Icon name="refresh" class="icon-sm" />
				</button>
			</div>
		{/each}
	{/if}
</div>
