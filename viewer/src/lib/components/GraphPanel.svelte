<script lang="ts">
	import { onMount } from 'svelte';

	interface GraphNode {
		id: string;
		type: string;
		label: string;
		summary: string;
	}

	interface GraphEdge {
		source: string;
		target: string;
		relation: string;
	}

	let { path = '', graph = { nodes: [], edges: [] } }: {
		path?: string;
		graph?: { nodes: GraphNode[]; edges: GraphEdge[] };
	} = $props();

	let svgContent = $state('');
	let loading = $state(false);

	function getRelatedNodes(dirPath: string) {
		const relatedIds = new Set<string>();
		const relatedEdges: GraphEdge[] = [];

		for (const node of graph.nodes) {
			if (node.id.startsWith(dirPath + '/') || node.id === dirPath) {
				relatedIds.add(node.id);
			}
		}

		for (const edge of graph.edges) {
			if (relatedIds.has(edge.source) || relatedIds.has(edge.target)) {
				relatedEdges.push(edge);
				relatedIds.add(edge.source);
				relatedIds.add(edge.target);
			}
		}

		return {
			nodes: graph.nodes.filter((n) => relatedIds.has(n.id)),
			edges: relatedEdges
		};
	}

	async function renderGraph() {
		if (!path || graph.nodes.length === 0) return;

		loading = true;
		const { nodes, edges } = getRelatedNodes(path);

		if (nodes.length === 0) {
			svgContent = '';
			loading = false;
			return;
		}

		let mermaidCode = 'graph TD;\n';
		for (const node of nodes) {
			const shortId = node.id.split('/').pop() || node.id;
			const typeIcon = getTypeIcon(node.type);
			mermaidCode += `    ${node.id.replace(/[^a-zA-Z0-9]/g, '_')}["${typeIcon} ${shortId}"];\n`;
		}
		for (const edge of edges) {
			const sourceId = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
			const targetId = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
			mermaidCode += `    ${sourceId} -->|${edge.relation}| ${targetId};\n`;
		}

		try {
			const { default: mermaid } = await import('mermaid');
			mermaid.initialize({ startOnLoad: false, theme: 'dark' });
			const { svg } = await mermaid.render('graph-' + Date.now(), mermaidCode);
			svgContent = svg;
		} catch (err) {
			console.error('Mermaid render error:', err);
			svgContent = '<p class="text-red-500">Failed to render graph</p>';
		} finally {
			loading = false;
		}
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case 'component':
				return '🧩';
			case 'page':
				return '📄';
			case 'module':
				return '📦';
			case 'dockerfile':
				return '🐳';
			case 'config':
				return '⚙️';
			case 'package':
				return '📋';
			default:
				return '📎';
		}
	}

	$effect(() => {
		if (path && graph.nodes.length > 0) {
			renderGraph();
		}
	});
</script>

<div class="graph-panel p-4 border-t border-border">
	<div class="flex items-center justify-between mb-2">
		<h3 class="text-sm font-semibold">Relationships</h3>
		{#if loading}
			<span class="text-xs text-muted-foreground">Rendering...</span>
		{/if}
	</div>
	{#if svgContent}
		<div class="overflow-auto max-h-64 border border-border rounded-lg bg-muted/30 p-2">
			{@html svgContent}
		</div>
	{:else if !loading}
		<p class="text-xs text-muted-foreground">No relationships found</p>
	{/if}
</div>
