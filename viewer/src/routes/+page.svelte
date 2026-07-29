<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface Commit {
		hash: string;
		short: string;
		subject: string;
		author: string;
		date: string;
	}

	interface GitStats {
		branch: string;
		commitCount: string;
		lastCommit: string;
	}

	let commits = $state<Commit[]>([]);
	let stats = $state<GitStats | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const [logRes, statsRes] = await Promise.all([
			fetch('/api/git?action=log&limit=15'),
			fetch('/api/git?action=stats')
		]);
		const logData = await logRes.json();
		const statsData = await statsRes.json();
		commits = logData.commits || [];
		stats = statsData;
		loading = false;
	});

	const cards = [
		{ href: '/browse', label: 'File Browser', icon: '📁', desc: 'Browse repo files with syntax highlighting' },
		{ href: '/images', label: 'Docker Images', icon: '🐳', desc: '11 images with dependency topology' },
		{ href: '/compose', label: 'Compose Stack', icon: '🔗', desc: 'Service definitions and port mappings' },
		{ href: '/nginx', label: 'Nginx Routes', icon: '🌐', desc: 'Reverse proxy and vhost configuration' },
		{ href: '/ci', label: 'CI/CD Pipeline', icon: '⚙️', desc: 'GitHub Actions multi-arch build workflow' }
	];
</script>

<div class="p-6 max-w-5xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">OpenLaputa Infrastructure</h1>
		<p class="text-muted-foreground mt-1">Repository overview and infrastructure visualization</p>
	</div>

	{#if stats}
		<div class="grid grid-cols-3 gap-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Branch</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-lg font-mono text-accent-green">{stats.branch}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Commits</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-lg font-mono text-accent-yellow">{stats.commitCount}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Last Commit</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm font-mono text-foreground">{stats.lastCommit.split(' ')[0]}</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
		{#each cards as card}
			<a
				href={card.href}
				class="bg-card rounded-lg p-4 border border-border hover:border-primary/50 hover:bg-muted transition-all group"
			>
				<span class="text-2xl">{card.icon}</span>
				<h3 class="font-semibold mt-2 group-hover:text-accent-blue transition-colors">{card.label}</h3>
				<p class="text-xs text-muted-foreground mt-1">{card.desc}</p>
			</a>
		{/each}
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recent Commits</Card.Title>
		</Card.Header>
		{#if loading}
			<Card.Content class="space-y-3">
				{#each Array(5) as _}
					<div class="flex items-center gap-3">
						<Skeleton class="h-4 w-16" />
						<Skeleton class="h-4 flex-1" />
						<Skeleton class="h-4 w-20" />
						<Skeleton class="h-4 w-24" />
					</div>
				{/each}
			</Card.Content>
		{:else}
			<div class="divide-y divide-border">
				{#each commits as commit}
					<div class="px-(--card-spacing) py-2.5 flex items-center gap-3">
						<code class="text-xs text-accent-yellow font-mono">{commit.short}</code>
						<span class="flex-1 text-sm truncate">{commit.subject}</span>
						<span class="text-xs text-muted-foreground">{commit.author}</span>
						<span class="text-xs text-muted-foreground">{commit.date.split(' ')[0]}</span>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Root>
</div>
