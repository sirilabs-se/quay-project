<script lang="ts">
	import { quay } from "$lib/state/app-state.svelte";

	function isSelected(host: string, login: string): boolean {
		return quay.pendingAccountSelection?.host === host && quay.pendingAccountSelection?.login === login;
	}
</script>

<div class="modal-overlay" class:open={quay.accountModalOpen}>
	<div class="modal">
		<div class="modal-head"><h3 class="modal-title">Switch GitHub account</h3></div>
		<div class="modal-body">
			<p class="muted" style="margin:0 0 14px;font-size:12.5px;">
				This changes which identity is used for GitHub actions in this session — pull requests, issues, pushes over HTTPS, and API calls.
				Quay never switches accounts on its own.
			</p>
			{#if quay.accounts.length === 0}
				<div class="muted">No gh-authenticated accounts found. Run <span class="mono">gh auth login</span> to add one.</div>
			{/if}
			{#each quay.accounts as account (account.host + account.login)}
				<div
					class="account-option"
					class:selected={isSelected(account.host, account.login)}
					onclick={() => (quay.pendingAccountSelection = { host: account.host, login: account.login })}
					onkeydown={(e) =>
						(e.key === "Enter" || e.key === " ") && (quay.pendingAccountSelection = { host: account.host, login: account.login })}
					role="radio"
					aria-checked={isSelected(account.host, account.login)}
					tabindex="0"
				>
					<span class="radio"></span>
					<span class="dot dot-accent"></span>
					<div class="grow">
						<div style="font-weight:600;font-size:12.8px;">{account.login}</div>
						<div class="mono muted" style="font-size:11.5px;">{account.host} · {account.scopes.join(", ")}</div>
					</div>
				</div>
			{/each}
		</div>
		<div class="modal-foot">
			<button class="btn" onclick={() => quay.closeAccountModal()}>Cancel</button>
			<button class="btn btn-primary" disabled={!quay.pendingAccountSelection} onclick={() => quay.confirmAccountSwitch()}>
				Switch account
			</button>
		</div>
	</div>
</div>
