<script lang="ts">
	import FileTree from '$lib/components/FileTree.svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import MarkdownView from '$lib/components/MarkdownView.svelte';
	import GraphPanel from '$lib/components/GraphPanel.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

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

	let selectedFile = $state('');
	let selectedDir = $state('');
	let fileContent = $state('');
	let fileLanguage = $state('text');
	let loading = $state(false);
	let graph = $state<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

	async function loadGraph() {
		try {
			const res = await fetch('/api/graph');
			const data = await res.json();
			graph = data;
		} catch (err) {
			console.error('Failed to load graph:', err);
		}
	}

	function getLanguage(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() || '';
		const map: Record<string, string> = {
			ts: 'typescript',
			js: 'javascript',
			json: 'json',
			yml: 'yaml',
			yaml: 'yaml',
			md: 'markdown',
			sh: 'bash',
			bash: 'bash',
			dockerfile: 'dockerfile',
			conf: 'nginx',
			Caddyfile: 'nginx',
			py: 'python',
			go: 'go',
			html: 'html',
			css: 'css',
			toml: 'toml',
			xml: 'xml',
			sql: 'sql'
		};
		if (filename.toLowerCase() === 'dockerfile') return 'dockerfile';
		return map[ext] || 'text';
	}

	async function selectFile(path: string) {
		selectedFile = path;
		selectedDir = '';
		loading = true;
		const res = await fetch(`/api/files?action=content&path=${encodeURIComponent(path)}`);
		const data = await res.json();
		fileContent = data.content || '';
		fileLanguage = getLanguage(path);
		loading = false;
	}

	function selectDir(path: string) {
		selectedDir = path;
		selectedFile = '';
	}

	$effect(() => {
		loadGraph();
	});
</script>

<div class="flex h-full">
	<div class="w-72 border-r border-border overflow-auto shrink-0">
		<div class="p-3 border-b border-border">
			<h2 class="font-semibold text-sm">Repository Files</h2>
		</div>
		<div class="p-2">
			<FileTree onSelect={selectFile} onSelectDir={selectDir} {graph} />
		</div>
	</div>
	<div class="flex-1 flex flex-col overflow-hidden">
		{#if loading}
			<div class="p-6 space-y-4">
				<Skeleton class="h-5 w-64" />
				<Skeleton class="h-96 w-full" />
			</div>
		{:else if selectedFile}
			<div class="px-4 py-2 border-b border-border bg-card flex items-center gap-2">
				<span class="text-sm font-mono text-accent-blue">{selectedFile}</span>
			</div>
			<div class="flex-1 overflow-auto">
				{#if selectedFile.endsWith('.md')}
					<MarkdownView content={fileContent} />
				{:else}
					<div class="p-4">
						<CodeViewer content={fileContent} language={fileLanguage} />
					</div>
				{/if}
			</div>
			<GraphPanel path={selectedFile} {graph} />
		{:else if selectedDir}
			<div class="px-4 py-2 border-b border-border bg-card flex items-center gap-2">
				<span class="text-sm font-mono text-accent-blue">📁 {selectedDir}</span>
			</div>
			<div class="flex-1 overflow-auto">
				<GraphPanel path={selectedDir} {graph} />
			</div>
		{:else}
			<div class="flex items-center justify-center h-full text-muted-foreground">
				<div class="text-center">
					<p class="text-4xl mb-3">📁</p>
					<p>Select a file or directory to view</p>
				</div>
			</div>
		{/if}
	</div>
</div>
