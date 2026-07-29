<script lang="ts">
	import FileTree from './FileTree.svelte';

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

	let {
		path = '',
		onSelect = () => {},
		onSelectDir = () => {},
		graph = { nodes: [], edges: [] }
	}: {
		path?: string;
		onSelect?: (path: string) => void;
		onSelectDir?: (path: string) => void;
		graph?: { nodes: GraphNode[]; edges: GraphEdge[] };
	} = $props();

	interface FileItem {
		name: string;
		path: string;
		isDirectory: boolean;
		size: number;
	}

	let items = $state<FileItem[]>([]);
	let expanded = $state<Record<string, boolean>>({});
	let childItems = $state<Record<string, FileItem[]>>({});

	async function loadDir(dirPath: string) {
		const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
		const data = await res.json();
		return data.items || [];
	}

	async function toggleDir(item: FileItem) {
		if (expanded[item.path]) {
			expanded[item.path] = false;
			return;
		}
		expanded[item.path] = true;
		if (!childItems[item.path]) {
			childItems[item.path] = await loadDir(item.path);
		}
	}

	$effect(() => {
		loadDir(path).then((i) => (items = i));
	});

	function formatSize(bytes: number): string {
		if (bytes === 0) return '—';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getIcon(name: string, isDir: boolean): string {
		if (isDir) return '📁';
		if (name.endsWith('.md')) return '📝';
		if (name.endsWith('.yml') || name.endsWith('.yaml')) return '📋';
		if (name === 'Dockerfile') return '🐳';
		if (name.endsWith('.ts') || name.endsWith('.js')) return '📜';
		if (name.endsWith('.sh')) return '⚡';
		if (name.endsWith('.conf')) return '🔧';
		return '📄';
	}

	function getRelationCount(dirPath: string): number {
		if (graph.nodes.length === 0) return 0;
		return graph.edges.filter(
			(e) => e.source.startsWith(dirPath + '/') || e.target.startsWith(dirPath + '/')
		).length;
	}

	function getFileRelationCount(filePath: string): number {
		if (graph.nodes.length === 0) return 0;
		return graph.edges.filter((e) => e.source === filePath || e.target === filePath).length;
	}
</script>

<div class="text-sm">
	{#each items as item}
		<div>
			<button
				class="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded transition-colors text-left"
				onclick={() =>
					item.isDirectory ? toggleDir(item) : onSelect(item.path)}
			>
				{#if item.isDirectory}
					<span class="text-xs text-muted-foreground w-4">{expanded[item.path] ? '▾' : '▸'}</span>
				{:else}
					<span class="w-4"></span>
				{/if}
				<span>{getIcon(item.name, item.isDirectory)}</span>
				<span class="flex-1 truncate">{item.name}</span>
				{#if item.isDirectory}
					{@const count = getRelationCount(item.path)}
					{#if count > 0}
						<span class="text-xs px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue">{count}</span>
					{/if}
				{:else}
					{@const count = getFileRelationCount(item.path)}
					{#if count > 0}
						<span class="text-xs px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue">{count}</span>
					{:else}
						<span class="text-xs text-muted-foreground">{formatSize(item.size)}</span>
					{/if}
				{/if}
			</button>
			{#if item.isDirectory}
				{#if expanded[item.path] && childItems[item.path]}
					<div class="ml-4 border-l border-border/50">
						<FileTree path={item.path} {onSelect} {onSelectDir} {graph} />
					</div>
				{/if}
				{@const dirCount = getRelationCount(item.path)}
				{#if dirCount > 0}
					<button
						class="ml-6 mb-1 text-xs text-muted-foreground hover:text-accent-blue transition-colors"
						onclick={() => onSelectDir(item.path)}
					>
						View relationships →
					</button>
				{/if}
			{/if}
		</div>
	{/each}
</div>
