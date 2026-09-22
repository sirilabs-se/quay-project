<script lang="ts">
	import { ICONS, type IconName } from "$lib/icons";

	let { name, class: klass = "" }: { name: IconName | string; class?: string } = $props();
</script>

<svg class="icon {klass}" viewBox="0 0 24 24">
	{@html ICONS[name] ?? ""}
</svg>
