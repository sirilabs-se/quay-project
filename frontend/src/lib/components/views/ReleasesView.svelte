<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";
</script>

<div class="view active">
	<div class="list-toolbar">
		<div class="section-title" style="margin:0;">Releases</div>
		<button class="btn btn-sm" onclick={() => quay.openDraftReleaseModal()}><Icon name="plus" class="icon-sm" /> Draft a release</button>
	</div>

	{#if quay.releasesLoadError}
		<div class="warn-banner"><Icon name="bolt" /><div>{quay.releasesLoadError}</div></div>
	{:else if quay.releases.length === 0}
		<div class="panel panel-pad" style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
			<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">No releases yet</div>
			<div style="font-size:12.5px;">Draft one from an existing tag.</div>
		</div>
	{:else}
		{#each quay.releases as release (release.tag)}
			<div class="item-row">
				<span class="item-icon" style="color:var(--accent-strong);"><Icon name="tag" /></span>
				<div class="grow">
					<div class="item-title">
						{release.title}
						{#if release.prerelease}<span class="badge badge-amber">Pre-release</span>{/if}
						{#if release.draft}<span class="badge badge-muted">Draft</span>{/if}
					</div>
					<div class="item-sub">
						<span class="mono">{release.tag}</span> · published {new Date(release.publishedAt).toLocaleString()}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
