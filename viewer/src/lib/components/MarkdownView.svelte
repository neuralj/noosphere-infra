<script lang="ts">
	import { onMount } from 'svelte';

	let { content = '' }: { content?: string } = $props();

	let html = $state('');

	onMount(async () => {
		const { marked } = await import('marked');
		const result = await marked(content);
		html = typeof result === 'string' ? result : '';
	});
</script>

<div class="markdown-body prose prose-invert max-w-none p-6">
	{@html html}
</div>

<style>
	.markdown-body :global(h1) {
		font-size: 1.75rem;
		font-weight: 700;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
		color: var(--color-accent-blue);
	}
	.markdown-body :global(h2) {
		font-size: 1.375rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--color-accent-purple);
	}
	.markdown-body :global(h3) {
		font-size: 1.125rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	.markdown-body :global(p) {
		margin-bottom: 0.75rem;
		line-height: 1.7;
	}
	.markdown-body :global(code) {
		background: var(--color-surface-lighter);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	.markdown-body :global(pre) {
		background: var(--color-surface-light);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1rem;
	}
	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
	}
	.markdown-body :global(a) {
		color: var(--color-accent-blue);
		text-decoration: underline;
	}
	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		padding-left: 1.5rem;
		margin-bottom: 0.75rem;
	}
	.markdown-body :global(li) {
		margin-bottom: 0.25rem;
	}
	.markdown-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}
	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid var(--color-border);
		padding: 0.5rem 0.75rem;
		text-align: left;
	}
	.markdown-body :global(th) {
		background: var(--color-surface-light);
		font-weight: 600;
	}
	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--color-primary);
		padding-left: 1rem;
		color: var(--color-text-muted);
		margin-bottom: 0.75rem;
	}
</style>
