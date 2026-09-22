<script lang="ts">
	import Icon from "../Icon.svelte";
	import { quay } from "$lib/state/app-state.svelte";

	let detection = $derived(quay.detection);
	let settings = $derived(quay.settings);
	let anyPlaintext = $derived(quay.accounts.some((a) => !a.keyringBacked));

	async function updateTheme(e: Event): Promise<void> {
		const value = (e.target as HTMLSelectElement).value as "light" | "dark" | "system";
		await quay.saveSettings({ theme: value });
	}

	async function updateRefreshInterval(e: Event): Promise<void> {
		const value = Number((e.target as HTMLInputElement).value);
		if (!Number.isFinite(value) || value <= 0) return;
		await quay.saveSettings({ refreshIntervalSeconds: value });
	}
</script>

<div class="view active">
	<div class="section-title">Detected tools</div>
	<div class="panel panel-pad" style="margin-bottom:16px;max-width:560px;">
		{#if detection}
			<div class="row between" style="padding:6px 0;">
				<div class="row g-10">
					<span style="color:{detection.git.installed ? 'var(--green)' : 'var(--red)'};">
						<Icon name={detection.git.installed ? "check" : "x"} class="icon-sm" />
					</span>
					<div>
						<div style="font-weight:600;">Git</div>
						<div class="mono muted" style="font-size:11px;">{detection.git.installed ? "on PATH" : "not found"}</div>
					</div>
				</div>
				<span class="badge badge-muted mono">{detection.git.version ?? "—"}</span>
			</div>
			<div class="divider"></div>
			<div class="row between" style="padding:6px 0;">
				<div class="row g-10">
					<span style="color:{detection.gh.installed ? 'var(--green)' : 'var(--red)'};">
						<Icon name={detection.gh.installed ? "check" : "x"} class="icon-sm" />
					</span>
					<div>
						<div style="font-weight:600;">GitHub CLI</div>
						<div class="mono muted" style="font-size:11px;">{detection.gh.installed ? "on PATH" : "not found"}</div>
					</div>
				</div>
				<span class="badge badge-muted mono">{detection.gh.version ?? "—"}</span>
			</div>
		{:else}
			<div class="muted">Checking…</div>
		{/if}
	</div>

	<div class="section-title">Account authentication</div>
	<div style="max-width:560px;margin-bottom:16px;">
		{#if anyPlaintext}
			<div class="warn-banner">
				<Icon name="bolt" />
				<div>
					<strong>No OS keyring detected.</strong> No Secret Service backend (GNOME Keyring, KWallet) is running, so gh is storing at least
					one token in plaintext at <span class="mono">~/.config/gh/hosts.yml</span> with restrictive file permissions.
				</div>
			</div>
		{/if}
		<div class="panel panel-pad">
			{#each quay.accounts as account (account.host + account.login)}
				<div class="cred-row">
					<div class="row g-8" style="margin-bottom:4px;">
						<span class="dot dot-accent"></span>
						<strong>{account.login}</strong>
						<span class="mono muted" style="font-size:11.5px;">{account.host}</span>
						{#if account.host === quay.activeAccount?.host && account.login === quay.activeAccount?.login}
							<span class="badge badge-accent">active</span>
						{/if}
					</div>
					<div class="muted" style="font-size:11.5px;margin-bottom:3px;">Scopes: <span class="mono">{account.scopes.join(", ")}</span></div>
					<div class="muted" style="font-size:11.5px;">
						Storage: <span class="mono">{account.keyringBacked ? "OS keyring" : "~/.config/gh/hosts.yml"}</span>
					</div>
				</div>
			{/each}
			{#if quay.accounts.length === 0}
				<div class="muted">No accounts authenticated. Run <span class="mono">gh auth login</span> to add one.</div>
			{/if}
		</div>
	</div>

	<div class="section-title">Preferences</div>
	<div class="panel panel-pad" style="max-width:560px;">
		{#if settings}
			<div class="row between" style="padding:7px 0;">
				<span class="muted">Theme</span>
				<select
					value={settings.theme}
					onchange={updateTheme}
					style="background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;padding:5px 8px;"
				>
					<option value="system">System</option>
					<option value="dark">Dark</option>
					<option value="light">Light</option>
				</select>
			</div>
			<div class="row between" style="padding:7px 0;">
				<span class="muted">Auto-refresh interval (seconds)</span>
				<input
					type="text"
					inputmode="numeric"
					value={settings.refreshIntervalSeconds}
					onchange={updateRefreshInterval}
					style="width:80px;text-align:right;"
				/>
			</div>
			<div class="row between" style="padding:7px 0;">
				<span class="muted">Editor</span>
				<span class="chip">{settings.editorPath ?? "Not set"}</span>
			</div>
			<div class="row between" style="padding:7px 0;">
				<span class="muted">Terminal</span>
				<span class="chip">{settings.terminalCommand ?? "Not set"}</span>
			</div>
		{:else}
			<div class="muted">Loading…</div>
		{/if}
	</div>
</div>
