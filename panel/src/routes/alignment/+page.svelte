<script lang="ts">
	import { onMount } from 'svelte';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import ContentViewer from './components/ContentViewer.svelte';
	import ScoreAnalysis from './components/ScoreAnalysis.svelte';
	import TabNav from './components/TabNav.svelte';

	interface LayerContent {
		exists: boolean;
		content: string;
		sections: string[];
		completeness: number;
	}

	interface AlignmentContent {
		raw: string;
		path: string;
		layers: Record<string, LayerContent>;
		metadata: {
			lastModified: string;
			wordCount: number;
			hasMetacognition: boolean;
			hasKnowledgeNetwork: boolean;
			exists: boolean;
		};
	}

	interface AlignmentScore {
		overall: number;
		layers: Record<string, number>;
		suggestions: string[];
	}

	const tabs = [
		{ id: 'view', label: '内容查看', icon: '📄' },
		{ id: 'score', label: '对齐度分析', icon: '📊' }
	];

	let content = $state<AlignmentContent | null>(null);
	let score = $state<AlignmentScore | null>(null);
	let loading = $state(true);
	let activeTab = $state('view');

	async function loadContent() {
		try {
			const res = await fetch('/alignment/api/content');
			content = await res.json();
		} catch (e) {
			console.error('Failed to load content:', e);
		}
	}

	async function loadScore() {
		try {
			const res = await fetch('/alignment/api/score');
			score = await res.json();
		} catch (e) {
			console.error('Failed to load score:', e);
		}
	}

	async function loadAll() {
		loading = true;
		await Promise.all([loadContent(), loadScore()]);
		loading = false;
	}

	onMount(() => {
		loadAll();
	});
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Alignment</h1>
		<p class="text-muted-foreground mt-1">
			人类心智模型与 AI 智能体的标准化对齐验证
		</p>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-48 w-full" />
			<Skeleton class="h-48 w-full" />
		</div>
	{:else}
		<div class="space-y-6">
			<TabNav {tabs} {activeTab} onTabChange={(id) => activeTab = id} />
			
			<div class="bg-surface-light border border-border rounded-xl p-6">
				{#if activeTab === 'view'}
					{#if content}
						<ContentViewer {content} />
					{:else}
						<div class="text-center py-12 text-text-muted">
							无法加载内容
						</div>
					{/if}
				{:else if activeTab === 'score'}
					{#if score}
						<ScoreAnalysis {score} />
					{:else}
						<div class="text-center py-12 text-text-muted">
							无法加载评分
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>
