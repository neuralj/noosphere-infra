<script lang="ts">
	import { onMount } from 'svelte';

	let { code = '' }: { code?: string } = $props();

	let container = $state<HTMLDivElement | null>(null);
	let error = $state('');

	onMount(async () => {
		if (!container) return;
		try {
			const mermaid = (await import('mermaid')).default;
			mermaid.initialize({
				startOnLoad: false,
				theme: 'dark',
				themeVariables: {
					primaryColor: '#3b82f6',
					primaryTextColor: '#cdd6f4',
					primaryBorderColor: '#3e3e5e',
					lineColor: '#7f849c',
					secondaryColor: '#2a2a3e',
					tertiaryColor: '#1e1e2e'
				}
			});
			const id = `mermaid-${Math.random().toString(36).slice(2)}`;
			const { svg } = await mermaid.render(id, code);
			if (container) container.innerHTML = svg;
		} catch (e) {
			error = String(e);
		}
	});
</script>

<div class="mermaid-wrapper">
	{#if error}
		<div class="p-4 text-accent-red text-sm">{error}</div>
	{:else}
		<div bind:this={container} class="flex justify-center"></div>
	{/if}
</div>

<style>
	.mermaid-wrapper :global(svg) {
		max-width: 100%;
		height: auto;
	}
</style>
