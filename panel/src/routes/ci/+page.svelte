<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface WorkflowRun {
		id: number;
		name: string;
		head_branch: string;
		status: string;
		conclusion: string | null;
		created_at: string;
		updated_at: string;
		html_url: string;
		run_number: number;
		event: string;
	}

	interface Job {
		id: number;
		name: string;
		status: string;
		conclusion: string | null;
		started_at: string;
		completed_at: string | null;
		html_url: string;
	}

	interface Overview {
		workflow: { name: string; file: string; url: string };
		images: string[];
		recentRuns: WorkflowRun[];
		stats: { total: number; success: number; failure: number; successRate: number };
	}

	let overview = $state<Overview | null>(null);
	let loading = $state(true);
	let selectedRun = $state<WorkflowRun | null>(null);
	let selectedRunJobs = $state<Job[]>([]);
	let jobsLoading = $state(false);
	let triggerLoading = $state(false);
	let triggerMessage = $state('');
	let fastPolling = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let fastPollTimeout: ReturnType<typeof setTimeout> | null = null;
	let jobsIntervalId: ReturnType<typeof setInterval> | null = null;

	async function fetchOverview() {
		try {
			const res = await fetch('/api/ci?action=overview');
			const data = await res.json();
			overview = data;
			if (selectedRun) {
				const updated = data.recentRuns.find((r: WorkflowRun) => r.id === selectedRun.id);
				if (updated) selectedRun = updated;
			}
			if (fastPolling && !hasActiveRuns()) {
				stopFastPolling();
			}
		} catch (e) {
			console.error('Failed to fetch CI overview:', e);
		} finally {
			loading = false;
		}
	}

	function hasActiveRuns(): boolean {
		if (!overview) return false;
		return overview.recentRuns.some(r => r.status === 'in_progress' || r.status === 'queued');
	}

	function startFastPolling() {
		fastPolling = true;
		if (intervalId) clearInterval(intervalId);
		intervalId = setInterval(fetchOverview, 5000);
		if (fastPollTimeout) clearTimeout(fastPollTimeout);
		fastPollTimeout = setTimeout(stopFastPolling, 120000);
	}

	function stopFastPolling() {
		fastPolling = false;
		if (fastPollTimeout) {
			clearTimeout(fastPollTimeout);
			fastPollTimeout = null;
		}
		if (intervalId) clearInterval(intervalId);
		intervalId = setInterval(fetchOverview, 30000);
	}

	async function selectRun(run: WorkflowRun) {
		selectedRun = run;
		await fetchJobs(run.id);
		if (jobsIntervalId) clearInterval(jobsIntervalId);
		if (run.status === 'in_progress' || run.status === 'queued') {
			jobsIntervalId = setInterval(() => fetchJobs(run.id), 5000);
		}
	}

	async function fetchJobs(runId: number) {
		jobsLoading = true;
		try {
			const res = await fetch(`/api/ci?action=jobs&run_id=${runId}`);
			const data = await res.json();
			selectedRunJobs = data;
			if (selectedRun) {
				const allDone = data.every((j: Job) => j.status === 'completed');
				if (allDone && jobsIntervalId) {
					clearInterval(jobsIntervalId);
					jobsIntervalId = null;
				}
			}
		} catch (e) {
			console.error('Failed to fetch jobs:', e);
			selectedRunJobs = [];
		} finally {
			jobsLoading = false;
		}
	}

	async function triggerBuild() {
		triggerLoading = true;
		triggerMessage = '';
		try {
			const res = await fetch('/api/ci?action=trigger', { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				triggerMessage = 'Build triggered! Polling every 5s...';
				await fetchOverview();
				startFastPolling();
			} else {
				triggerMessage = `Failed: ${data.error}`;
			}
		} catch (e) {
			triggerMessage = `Error: ${String(e)}`;
		} finally {
			triggerLoading = false;
		}
	}

	function getStatusIcon(status: string, conclusion: string | null): string {
		if (status === 'in_progress' || status === 'queued') return '⏳';
		if (conclusion === 'success') return '✅';
		if (conclusion === 'failure') return '❌';
		if (conclusion === 'cancelled') return '🚫';
		if (conclusion === 'skipped') return '⏭️';
		return '⚪';
	}

	function getStatusColor(status: string, conclusion: string | null): string {
		if (status === 'in_progress' || status === 'queued') return 'text-accent-yellow';
		if (conclusion === 'success') return 'text-green-500';
		if (conclusion === 'failure') return 'text-red-500';
		if (conclusion === 'cancelled') return 'text-muted-foreground';
		return 'text-muted-foreground';
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		const mins = Math.floor(diff / (1000 * 60));
		if (mins > 0) return `${mins}m ago`;
		return 'just now';
	}

	function formatDuration(start: string, end: string | null): string {
		const startTime = new Date(start).getTime();
		const endTime = end ? new Date(end).getTime() : Date.now();
		const seconds = Math.floor((endTime - startTime) / 1000);
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	onMount(() => {
		fetchOverview();
		intervalId = setInterval(fetchOverview, 30000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
		if (fastPollTimeout) clearTimeout(fastPollTimeout);
		if (jobsIntervalId) clearInterval(jobsIntervalId);
	});
</script>

<div class="p-6 max-w-7xl mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-accent-blue">CI/CD Pipeline</h1>
			<p class="text-muted-foreground mt-1">
				{#if overview}
					<a href={overview.workflow.url} target="_blank" class="hover:text-accent-blue transition-colors">
						{overview.workflow.name} ({overview.workflow.file}) ↗
					</a>
				{:else}
					GitHub Actions workflow: build.yml
				{/if}
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if fastPolling}
				<span class="text-xs text-accent-yellow flex items-center gap-1">
					<span class="animate-pulse">●</span> Live (5s)
				</span>
			{/if}
			<Button onclick={triggerBuild} disabled={triggerLoading || !overview}>
				{triggerLoading ? '⏳ Triggering...' : '🚀 Trigger Build'}
			</Button>
			{#if triggerMessage}
				<span class="text-sm {triggerMessage.includes('Failed') || triggerMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}">
					{triggerMessage}
				</span>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-48 w-full" />
			<Skeleton class="h-48 w-full" />
		</div>
	{:else if overview}
		<div class="grid grid-cols-4 gap-4">
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Total Builds</p>
					<p class="text-2xl font-bold">{overview.stats.total}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Successful</p>
					<p class="text-2xl font-bold text-green-500">{overview.stats.success}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Failed</p>
					<p class="text-2xl font-bold text-red-500">{overview.stats.failure}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Success Rate</p>
					<p class="text-2xl font-bold text-accent-blue">{overview.stats.successRate}%</p>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid grid-cols-3 gap-6">
			<div class="col-span-2 space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Recent Builds</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each overview.recentRuns as run}
								<button
									class="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left {selectedRun?.id === run.id ? 'bg-muted' : ''}"
									onclick={() => selectRun(run)}
								>
									<span class="text-lg">{getStatusIcon(run.status, run.conclusion)}</span>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-mono text-sm">#{run.run_number}</span>
											<span class="text-xs text-muted-foreground truncate">{run.head_branch}</span>
											{#if run.event === 'workflow_dispatch'}
												<span class="text-xs px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple">manual</span>
											{/if}
										</div>
										<p class="text-xs text-muted-foreground mt-0.5">
											{formatTime(run.created_at)}
											{#if run.conclusion}
												· {formatDuration(run.created_at, run.updated_at)}
											{/if}
										</p>
									</div>
									<span class={getStatusColor(run.status, run.conclusion)}>
										{run.conclusion || run.status}
									</span>
								</button>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				{#if selectedRun}
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-sm flex items-center gap-2">
								<span>{getStatusIcon(selectedRun.status, selectedRun.conclusion)}</span>
								<span>Build #{selectedRun.run_number} Details</span>
								<a href={selectedRun.html_url} target="_blank" class="text-xs text-accent-blue hover:underline ml-auto">
									View on GitHub ↗
								</a>
							</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if jobsLoading}
								<div class="space-y-2">
									<Skeleton class="h-12 w-full" />
									<Skeleton class="h-12 w-full" />
								</div>
							{:else if selectedRunJobs.length > 0}
								<div class="space-y-2">
									{#each selectedRunJobs as job}
										<div class="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
											<span class="text-lg">{getStatusIcon(job.status, job.conclusion)}</span>
											<div class="flex-1">
												<p class="text-sm font-medium">{job.name}</p>
												<p class="text-xs text-muted-foreground">
													{formatDuration(job.started_at, job.completed_at)}
												</p>
											</div>
											<span class={getStatusColor(job.status, job.conclusion)}>
												{job.conclusion || job.status}
											</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">No jobs found</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Managed Images ({overview.images.length})</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-2">
							{#each overview.images as img}
								<span class="px-2.5 py-1 bg-muted rounded text-xs font-mono text-accent-blue">
									{img}
								</span>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Pipeline Flow</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							<div class="flex items-center gap-2 p-2 rounded bg-muted/30">
								<span>🔍</span>
								<span class="text-sm font-medium text-accent-yellow">changes</span>
							</div>
							<div class="flex items-center gap-2 p-2 rounded bg-muted/30">
								<span>🔨</span>
								<span class="text-sm font-medium text-accent-blue">build</span>
								<span class="text-xs text-muted-foreground ml-auto">amd64 + arm64</span>
							</div>
							<div class="flex items-center gap-2 p-2 rounded bg-muted/30">
								<span>🔀</span>
								<span class="text-sm font-medium text-accent-green">merge-manifests</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Registry</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2 text-xs">
						<div>
							<span class="text-muted-foreground">Source:</span>
							<code class="ml-1 text-accent-yellow">ghcr.io/neuralj/&lt;name&gt;:&lt;tag&gt;</code>
						</div>
						<div>
							<span class="text-muted-foreground">Mirror:</span>
							<code class="ml-1 text-accent-green">ghcr.nju.edu.cn/neuralj/...</code>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>
