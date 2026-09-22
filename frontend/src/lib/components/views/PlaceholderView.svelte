<script lang="ts">
	let { title, subtitle }: { title: string; subtitle: string } = $props();
</script>

<div class="view active">
	<div class="panel panel-pad" style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
		<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">{title}</div>
		<div style="font-size:12.5px;">{subtitle}</div>
	</div>
</div>
