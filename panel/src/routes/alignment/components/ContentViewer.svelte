<script lang="ts">
	import { marked } from 'marked';

	interface LayerContent {
		exists: boolean;
		content: string;
		sections: string[];
		completeness: number;
	}

	interface Props {
		content: {
			raw: string;
			path: string;
			layers: {
				value: LayerContent;
				rule: LayerContent;
				structure: LayerContent;
				concept: LayerContent;
				perception: LayerContent;
			};
			metadata: {
				lastModified: string;
				wordCount: number;
				hasMetacognition: boolean;
				hasKnowledgeNetwork: boolean;
				exists: boolean;
			};
		};
	}

	let { content }: Props = $props();

	const layerLabels: Record<string, string> = {
		value: 'Purpose',
		rule: 'Constraints',
		structure: 'Architecture',
		concept: 'Glossary',
		perception: 'Operations'
	};

	const layerColors: Record<string, string> = {
		value: 'border-accent-blue/40 hover:border-accent-blue',
		rule: 'border-accent-green/40 hover:border-accent-green',
		structure: 'border-accent-purple/40 hover:border-accent-purple',
		concept: 'border-accent-yellow/40 hover:border-accent-yellow',
		perception: 'border-accent-red/40 hover:border-accent-red'
	};

	const layerAccents: Record<string, string> = {
		value: 'text-accent-blue',
		rule: 'text-accent-green',
		structure: 'text-accent-purple',
		concept: 'text-accent-yellow',
		perception: 'text-accent-red'
	};

	const layerOrder = ['value', 'rule', 'structure', 'concept', 'perception'] as const;

	let expandedLayers = $state<Record<string, boolean>>({});
	let showRaw = $state(false);

	function toggleLayer(layer: string) {
		expandedLayers[layer] = !expandedLayers[layer];
	}

	function formatDate(iso: string): string {
		if (!iso) return '-';
		const d = new Date(iso);
		return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
	}

	function renderLayerContent(layerContent: string): string {
		if (!layerContent) return '';
		return marked(layerContent) as string;
	}

	const rawHtml = $derived(content.raw ? marked(content.raw) : '');

	const totalWords = $derived(content.metadata.wordCount);
	const totalLayers = $derived(
		layerOrder.filter(l => content.layers[l].exists).length
	);
</script>

<div class="space-y-6">
	<!-- Metadata Bar -->
	<div class="bg-surface border border-border rounded-xl p-4">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div class="flex items-center gap-6">
				<div class="flex items-center gap-2">
					<span class="text-text-muted text-sm">文件</span>
					<span class="text-sm font-mono text-text">AGENTS.md</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-text-muted text-sm">更新</span>
					<span class="text-sm text-text">{formatDate(content.metadata.lastModified)}</span>
				</div>
			</div>
			<div class="flex items-center gap-4">
				<div class="text-center">
					<span class="text-lg font-bold text-accent-blue">{totalWords}</span>
					<span class="text-xs text-text-muted ml-1">字</span>
				</div>
				<div class="text-center">
					<span class="text-lg font-bold text-accent-purple">{totalLayers}/5</span>
					<span class="text-xs text-text-muted ml-1">层</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-sm {content.metadata.hasMetacognition ? 'text-accent-green' : 'text-text-muted'}">
						{content.metadata.hasMetacognition ? '✓' : '✗'}
					</span>
					<span class="text-xs text-text-muted">元认知</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-sm {content.metadata.hasKnowledgeNetwork ? 'text-accent-green' : 'text-text-muted'}">
						{content.metadata.hasKnowledgeNetwork ? '✓' : '✗'}
					</span>
					<span class="text-xs text-text-muted">知识网络</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Layer Cards -->
	<div class="space-y-3">
		{#each layerOrder as layer}
			{@const layerData = content.layers[layer]}
			<div class="bg-surface border rounded-xl overflow-hidden transition-colors {layerColors[layer]}">
				<!-- Layer Header -->
				<button
					class="w-full flex items-center justify-between p-4 text-left"
					onclick={() => toggleLayer(layer)}
				>
					<div class="flex items-center gap-3">
						<span class="text-sm font-semibold {layerAccents[layer]}">{layerLabels[layer]}</span>
						{#if layerData.sections.length > 0}
							<span class="text-xs text-text-muted">
								{layerData.sections.length} 节
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-2">
							<div class="w-20 h-1.5 bg-surface-lighter rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {layerAccents[layer].replace('text-', 'bg-')}"
									style="width: {layerData.completeness}%"
								></div>
							</div>
							<span class="text-xs text-text-muted min-w-[32px] text-right">{layerData.completeness}%</span>
						</div>
						<span class="text-text-muted text-sm transition-transform duration-200 {expandedLayers[layer] ? 'rotate-180' : ''}">
							▼
						</span>
					</div>
				</button>

				<!-- Layer Content (collapsible) -->
				{#if expandedLayers[layer] && layerData.content}
					<div class="border-t border-border">
						<!-- Sections list -->
						{#if layerData.sections.length > 0}
							<div class="px-4 py-2 bg-surface-lighter/50 flex flex-wrap gap-2">
								{#each layerData.sections as section}
									<span class="text-xs px-2 py-0.5 rounded bg-surface-lighter text-text-muted">
										{section}
									</span>
								{/each}
							</div>
						{/if}
						<!-- Rendered content -->
						<div class="p-4 max-h-96 overflow-y-auto">
							<div class="prose prose-invert prose-sm max-w-none">
								{@html renderLayerContent(layerData.content)}
							</div>
						</div>
					</div>
				{:else if expandedLayers[layer] && !layerData.exists}
					<div class="border-t border-border p-4 text-center text-text-muted text-sm">
						该层内容缺失
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Raw Markdown Toggle -->
	<div class="bg-surface border border-border rounded-xl overflow-hidden">
		<button
			class="w-full flex items-center justify-between p-4 text-left hover:bg-surface-lighter/30 transition-colors"
			onclick={() => showRaw = !showRaw}
		>
			<div class="flex items-center gap-2">
				<span class="text-text-muted">📄</span>
				<span class="text-sm font-medium text-text">查看原始 Markdown</span>
			</div>
			<span class="text-text-muted text-sm transition-transform duration-200 {showRaw ? 'rotate-180' : ''}">
				▼
			</span>
		</button>
		{#if showRaw && content.raw}
			<div class="border-t border-border p-4 max-h-[600px] overflow-y-auto">
				<div class="prose prose-invert prose-sm max-w-none">
					{@html rawHtml}
				</div>
			</div>
		{/if}
	</div>
</div>
