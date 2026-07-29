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
			if (container) {
				container.innerHTML = svg;
				const svgEl = container.querySelector('svg') as SVGSVGElement | null;
				if (svgEl) {
					svgEl.removeAttribute('width');
					svgEl.removeAttribute('height');
					svgEl.style.width = '100%';
					svgEl.style.height = 'auto';
					svgEl.style.display = 'block';
					const vb = svgEl.viewBox.baseVal;
					if (vb && vb.width > 0 && vb.height > 0) {
						const aspect = vb.width / vb.height;
						svgEl.style.aspectRatio = `${aspect}`;
					}
				}
			}
		} catch (e) {
			error = String(e);
		}
	});
</script>

<div class="w-full overflow-x-auto">
	{#if error}
		<div class="p-4 text-accent-red text-sm">{error}</div>
	{:else}
		<div bind:this={container}></div>
	{/if}
</div>

