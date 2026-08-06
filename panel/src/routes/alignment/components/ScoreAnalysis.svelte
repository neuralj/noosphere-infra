<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import RadarChart from './RadarChart.svelte';

	interface LayerGoal {
		text: string;
		completed: boolean;
		layer: string;
	}

	interface Props {
		score: {
			overall: number;
			layers: {
				value: number;
				rule: number;
				structure: number;
				concept: number;
				perception: number;
			};
			suggestions: string[];
			goals: {
				value: LayerGoal[];
				rule: LayerGoal[];
				structure: LayerGoal[];
				concept: LayerGoal[];
				perception: LayerGoal[];
			};
			goalsProgress: {
				value: { total: number; completed: number; pending: number };
				rule: { total: number; completed: number; pending: number };
				structure: { total: number; completed: number; pending: number };
				concept: { total: number; completed: number; pending: number };
				perception: { total: number; completed: number; pending: number };
			};
			structureCheck: {
				value: number;
				rule: number;
				structure: number;
				concept: number;
				perception: number;
			};
		};
	}

	let { score }: Props = $props();

	const layerLabels: Record<string, string> = {
		value: 'Purpose',
		rule: 'Constraints',
		structure: 'Architecture',
		concept: 'Glossary',
		perception: 'Operations'
	};

	const layerColors: Record<string, string> = {
		value: 'bg-accent-blue',
		rule: 'bg-accent-green',
		structure: 'bg-accent-purple',
		concept: 'bg-accent-yellow',
		perception: 'bg-accent-red'
	};

	const layerOrder = ['value', 'rule', 'structure', 'concept', 'perception'] as const;

	function getStatusColor(overall: number): string {
		if (overall >= 90) return 'text-accent-green';
		if (overall >= 70) return 'text-accent-blue';
		if (overall >= 50) return 'text-accent-yellow';
		return 'text-accent-red';
	}

	function getStatusLabel(overall: number): string {
		if (overall >= 90) return '优秀';
		if (overall >= 70) return '良好';
		if (overall >= 50) return '需改进';
		return '不合格';
	}

	function getStatusVariant(overall: number): 'default' | 'destructive' {
		return overall >= 70 ? 'default' : 'destructive';
	}

	function getProgressPercent(progress: { total: number; completed: number }): number {
		if (progress.total === 0) return 100;
		return Math.round((progress.completed / progress.total) * 100);
	}

	const totalGoals = $derived(
		Object.values(score.goalsProgress).reduce((sum, p) => sum + p.total, 0)
	);

	const completedGoals = $derived(
		Object.values(score.goalsProgress).reduce((sum, p) => sum + p.completed, 0)
	);

	const pendingGoalsCount = $derived(totalGoals - completedGoals);

	const pendingGoalsByLayer = $derived(
		Object.entries(score.goals).map(([layer, goals]) => ({
			layer,
			layerName: layerLabels[layer],
			pending: goals.filter(g => !g.completed)
		})).filter(g => g.pending.length > 0)
	);
</script>

<div class="space-y-6">
	<!-- Hero KPI Bar -->
	<div class="grid grid-cols-3 gap-4">
		<div class="bg-surface border border-border rounded-xl p-4 text-center">
			<div class="text-4xl font-bold {getStatusColor(score.overall)}">
				{score.overall}
			</div>
			<div class="text-xs text-text-muted mt-1">总体评分</div>
			<Badge variant={getStatusVariant(score.overall)} class="mt-2">
				{getStatusLabel(score.overall)}
			</Badge>
		</div>
		<div class="bg-surface border border-border rounded-xl p-4 text-center">
			<div class="text-4xl font-bold text-accent-blue">
				{completedGoals}/{totalGoals}
			</div>
			<div class="text-xs text-text-muted mt-1">目标完成</div>
			<div class="text-xs text-text-muted mt-1">
				{totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 100}%
			</div>
		</div>
		<div class="bg-surface border border-border rounded-xl p-4 text-center">
			<div class="text-4xl font-bold {pendingGoalsCount > 0 ? 'text-accent-yellow' : 'text-accent-green'}">
				{pendingGoalsCount}
			</div>
			<div class="text-xs text-text-muted mt-1">待完成</div>
			<div class="text-xs text-text-muted mt-1">
				{pendingGoalsCount === 0 ? '✓ 全部完成' : '项待推进'}
			</div>
		</div>
	</div>

	<!-- Two-column: Radar + Layer Progress -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Radar Chart -->
		<div class="bg-surface border border-border rounded-xl p-4">
			<h3 class="text-sm font-semibold text-text mb-3 flex items-center gap-2">
				<span class="text-accent-purple">📊</span>
				五层雷达
			</h3>
			<div class="flex justify-center">
				<div class="max-w-sm w-full">
					<RadarChart scores={score.layers} structureCheck={score.structureCheck} />
				</div>
			</div>
			<div class="flex justify-center gap-4 mt-3 text-xs text-text-muted">
				<span class="flex items-center gap-1">
					<span class="w-3 h-3 rounded-full bg-accent-blue/30 border border-accent-blue"></span>
					目标完成率
				</span>
				<span class="flex items-center gap-1">
					<span class="w-3 h-3 rounded-full bg-accent-yellow/20 border border-accent-yellow border-dashed"></span>
					结构检查
				</span>
			</div>
		</div>

		<!-- Layer Progress -->
		<div class="bg-surface border border-border rounded-xl p-4">
			<h3 class="text-sm font-semibold text-text mb-3 flex items-center gap-2">
				<span class="text-accent-blue">🎯</span>
				各层进度
			</h3>
			<div class="space-y-4">
				{#each layerOrder as layer}
					{@const progress = score.goalsProgress[layer]}
					{@const percent = getProgressPercent(progress)}
					<div>
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm font-medium text-text">{layerLabels[layer]}</span>
							<span class="text-xs text-text-muted">{progress.completed}/{progress.total}</span>
						</div>
						<div class="h-2 bg-surface-lighter rounded-full overflow-hidden">
							<div
								class="h-full rounded-full transition-all duration-500 {layerColors[layer]}"
								style="width: {percent}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Pending Goals by Layer -->
	{#if pendingGoalsByLayer.length > 0}
		<div class="bg-surface border border-border rounded-xl p-4">
			<h3 class="text-sm font-semibold text-text mb-3 flex items-center gap-2">
				<span class="text-accent-yellow">💡</span>
				待完成目标
			</h3>
			<div class="space-y-3">
				{#each pendingGoalsByLayer as group}
					<div class="space-y-1.5">
						<div class="text-xs font-medium text-text-muted uppercase tracking-wide">
							{group.layerName}
						</div>
						{#each group.pending as goal}
							<div class="flex items-start gap-2 text-sm pl-2">
								<span class="text-accent-yellow mt-0.5">□</span>
								<span class="text-text">{goal.text}</span>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="bg-surface border border-border rounded-xl p-8 text-center">
			<p class="text-accent-green text-lg">✓ 所有目标已完成</p>
			<p class="text-sm text-text-muted mt-2">认知契约完整</p>
		</div>
	{/if}

	<!-- Structure Check (compact) -->
	<div class="bg-surface border border-border rounded-xl p-4">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-sm font-semibold text-text flex items-center gap-2">
				<span class="text-text-muted">🔍</span>
				结构检查
			</h3>
			<span class="text-xs text-text-muted">关键词/行数检测</span>
		</div>
		<div class="grid grid-cols-5 gap-2">
			{#each layerOrder as layer}
				{@const structScore = score.structureCheck[layer]}
				<div class="text-center">
					<div class="text-xs text-text-muted mb-1">{layerLabels[layer]}</div>
					<div class="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-500 {structScore >= 80 ? 'bg-accent-green' : structScore >= 50 ? 'bg-accent-yellow' : 'bg-accent-red'}"
							style="width: {structScore}%"
						></div>
					</div>
					<div class="text-xs text-text-muted mt-1">{structScore}%</div>
				</div>
			{/each}
		</div>
	</div>
</div>
