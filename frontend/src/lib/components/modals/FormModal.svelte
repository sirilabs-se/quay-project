<script lang="ts">
	import { quay } from "$lib/state/app-state.svelte";

	let values = $state<Record<string, string | boolean>>({});

	$effect(() => {
		if (quay.formModal) {
			const next: Record<string, string | boolean> = {};
			for (const field of quay.formModal.fields) next[field.key] = field.value;
			values = next;
		}
	});

	async function submit(): Promise<void> {
		if (!quay.formModal) return;
		const modal = quay.formModal;
		quay.closeFormModal();
		await modal.onSubmit(values);
	}
</script>

<div class="modal-overlay" class:open={quay.formModal !== null}>
	{#if quay.formModal}
		<div class="modal">
			<div class="modal-head"><h3 class="modal-title">{quay.formModal.title}</h3></div>
			<div class="modal-body">
				{#each quay.formModal.fields as field (field.key)}
					{#if field.type === "textarea"}
						<div class="field">
							<label class="field-label" for="formfield-{field.key}">{field.label}</label>
							<textarea id="formfield-{field.key}" bind:value={values[field.key]}></textarea>
						</div>
					{:else if field.type === "select"}
						<div class="field">
							<label class="field-label" for="formfield-{field.key}">{field.label}</label>
							<select
								id="formfield-{field.key}"
								bind:value={values[field.key]}
								style="width:100%;background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;padding:7px 8px;"
							>
								{#each field.options ?? [] as option (option)}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>
					{:else if field.type === "checkbox"}
						<label class="row g-8" style="font-size:12.5px;color:var(--text-secondary);cursor:pointer;margin-bottom:12px;">
							<input type="checkbox" style="width:auto;" bind:checked={values[field.key] as unknown as boolean} />
							{field.label}
						</label>
					{:else}
						<div class="field">
							<label class="field-label" for="formfield-{field.key}">{field.label}</label>
							<input id="formfield-{field.key}" type="text" bind:value={values[field.key]} />
						</div>
					{/if}
				{/each}
			</div>
			<div class="modal-foot">
				<button class="btn" onclick={() => quay.closeFormModal()}>Cancel</button>
				<button class="btn btn-primary" onclick={submit}>{quay.formModal.submitLabel}</button>
			</div>
		</div>
	{/if}
</div>
