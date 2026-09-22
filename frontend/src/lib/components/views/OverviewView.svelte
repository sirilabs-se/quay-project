<script lang="ts">
	import Icon from "../Icon.svelte";
	import type { IconName } from "$lib/icons";
	import { quay } from "$lib/state/app-state.svelte";

	let status = $derived(quay.status);
	let fileCount = $derived((status?.staged.length ?? 0) + (status?.modified.length ?? 0) + (status?.untracked.length ?? 0));

	function openNewBranchModal(): void {
		const base = status?.branch ?? "main";
		quay.openFormModal({
			title: "New branch",
			fields: [
				{ key: "name", label: "Branch name", type: "text", value: "" },
				{ key: "base", label: "Based on", type: "text", value: base },
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

	async function quickAction(action: "fetch" | "pull" | "push"): Promise<void> {
		await quay.runRemoteAction(action);
	}
</script>

{#snippet actionBtn(iconName: IconName, label: string, onClick: () => void, disabled = false)}
	<button class="btn" style="justify-content:flex-start;" {disabled} onclick={onClick}>
		<Icon name={iconName} class="icon-sm" />
		{label}
	</button>
{/snippet}

<div class="view active">
	{#if !quay.activeRepo}
		<div class="muted">Select a repository from the sidebar.</div>
	{:else if !status}
		<div class="muted">Loading…</div>
	{:else}
		<div class="stat-grid" style="margin-bottom:18px;">
			<div class="stat-box">
				<div class="stat-label">Branch</div>
				<div class="stat-value">{status.branch ?? "detached"}</div>
			</div>
			<div class="stat-box">
				<div class="stat-label">Ahead / behind</div>
				<div class="stat-value">
					<span style="color:var(--green);">↑{status.ahead}</span> <span style="color:var(--red);">↓{status.behind}</span>
				</div>
			</div>
			<div class="stat-box">
				<div class="stat-label">Working tree</div>
				<div class="stat-value" style="font-family:var(--font-sans);font-size:15px;">
					{fileCount} file{fileCount === 1 ? "" : "s"}
				</div>
			</div>
			<div class="stat-box">
				<div class="stat-label">Merge status</div>
				<div class="stat-value" style="font-family:var(--font-sans);font-size:15px;">
					{status.merging ? "Conflicts" : "Clean"}
				</div>
			</div>
		</div>

		<div class="row g-14" style="align-items:flex-start;">
			<div class="panel panel-pad grow">
				<div class="section-title">Latest commit</div>
				{#if status.lastCommit}
					<div class="commit-line">
						<Icon name="commit" class="icon-sm" />
						<div class="grow">
							<div style="font-weight:500;">{status.lastCommit.message}</div>
							<div class="muted" style="font-size:11.5px;margin-top:3px;">
								<span class="commit-sha">{status.lastCommit.sha.slice(0, 7)}</span> · {status.lastCommit.author} · {new Date(
									status.lastCommit.date
								).toLocaleString()}
							</div>
						</div>
					</div>
				{:else}
					<div class="muted">No commits yet.</div>
				{/if}
				<div class="divider"></div>
				<div class="section-title" style="margin-bottom:8px;">Remote</div>
				<div class="mono muted" style="font-size:12px;">{status.remoteUrl ?? "No origin remote configured"}</div>
			</div>
			<div class="panel panel-pad" style="width:230px;flex-shrink:0;">
				<div class="section-title">Quick actions</div>
				<div class="col g-8">
					{@render actionBtn("refresh", "Fetch", () => quickAction("fetch"))}
					{@render actionBtn("down", "Pull", () => quickAction("pull"))}
					{@render actionBtn("up", "Push", () => quickAction("push"), status.ahead === 0)}
					{@render actionBtn("branch", "New branch", openNewBranchModal)}
				</div>
			</div>
		</div>
	{/if}
</div>
