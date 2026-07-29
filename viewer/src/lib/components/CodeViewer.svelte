<script lang="ts">
	import { onMount } from 'svelte';

	let { content = '', language = 'text' }: { content?: string; language?: string } = $props();

	let html = $state('');
	let loading = $state(true);

	onMount(async () => {
		try {
			const { codeToHtml } = await import('shiki');
			html = await codeToHtml(content, {
				theme: 'github-dark-default',
				lang: language
			});
		} catch {
			html = `<pre style="white-space:pre-wrap;color:#cdd6f4;background:#1e1e2e;padding:1rem;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
		} finally {
			loading = false;
		}
	});
</script>

<div class="code-viewer overflow-auto rounded-lg border border-border">
	{#if loading}
		<div class="p-4 text-muted-foreground">Loading...</div>
	{:else}
		{@html html}
	{/if}
</div>

<style>
	.code-viewer :global(pre) {
		margin: 0;
		padding: 1rem;
		font-size: 0.8125rem;
		line-height: 1.6;
		overflow-x: auto;
	}
	.code-viewer :global(code) {
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
	}
</style>
