<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface Commit {
		hash: string;
		short: string;
		subject: string;
		author: string;
		date: string;
	}

	interface Service {
		name: string;
		status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'BACKOFF' | 'FATAL' | 'EXITED';
		port: number;
		pid: number | null;
	}

	interface CIStatus {
		workflow: { name: string; file: string; url: string };
		images: string[];
		recentRuns: any[];
		stats: { total: number; success: number; failure: number; successRate: number };
	}

	interface Activity {
		type: 'image' | 'config' | 'ui' | 'docs' | 'other';
		icon: string;
		title: string;
		description: string;
		commit: Commit;
	}

	let commits = $state<Commit[]>([]);
	let services = $state<Service[]>([]);
	let ciStatus = $state<CIStatus | null>(null);
	let loading = $state(true);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	async function fetchAll() {
		try {
			const [logRes, servicesRes, ciRes] = await Promise.all([
				fetch('/api/git?action=log&limit=10'),
				fetch('/api/services'),
				fetch('/api/ci?action=overview')
			]);
			if (logRes.ok) {
				const logData = await logRes.json();
				commits = logData.commits || [];
			}
			if (servicesRes.ok) {
				const servicesData = await servicesRes.json();
				services = servicesData.services || [];
			}
			if (ciRes.ok) {
				const ciData = await ciRes.json();
				if (ciData && !ciData.error) {
					ciStatus = ciData;
				}
			}
		} catch (e) {
			console.error('Failed to fetch dashboard data:', e);
		} finally {
			loading = false;
		}
	}

	function parseActivities(commits: Commit[]): Activity[] {
		return commits.map(commit => {
			const subject = commit.subject.toLowerCase();
			let type: Activity['type'] = 'other';
			let icon = '📝';
			let title = commit.subject;
			let description = '';

			if (subject.includes('image') || subject.includes('docker') || subject.includes('container')) {
				type = 'image';
				icon = '🐳';
				title = 'Image Update';
				description = commit.subject;
			} else if (subject.includes('caddy') || subject.includes('proxy') || subject.includes('config')) {
				type = 'config';
				icon = '⚙️';
				title = 'Config Change';
				description = commit.subject;
			} else if (subject.includes('ui') || subject.includes('viewer') || subject.includes('frontend')) {
				type = 'ui';
				icon = '🎨';
				title = 'UI Update';
				description = commit.subject;
			} else if (subject.includes('doc') || subject.includes('readme')) {
				type = 'docs';
				icon = '📚';
				title = 'Documentation';
				description = commit.subject;
			} else {
				description = commit.subject;
			}

			return { type, icon, title, description, commit };
		});
	}

	function formatTimeAgo(dateStr: string): string {
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

	onMount(() => {
		fetchAll();
		intervalId = setInterval(fetchAll, 30000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const navCards = [
		{ href: '/browse', label: 'File Browser', icon: '📁', desc: 'Browse repo files with syntax highlighting' },
		{ href: '/images', label: 'Docker Images', icon: '🐳', desc: 'Container images with dependency topology' },
		{ href: '/services', label: 'Services', icon: '⚡', desc: 'Local service status and management' },
		{ href: '/ci', label: 'CI/CD Pipeline', icon: '🔄', desc: 'GitHub Actions multi-arch build workflow' }
	];
</script>

<div class="p-6 max-w-7xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">OpenLaputa Infrastructure</h1>
		<p class="text-muted-foreground mt-1">Repository overview and infrastructure status</p>
	</div>

	{#if loading}
		<div class="grid grid-cols-4 gap-4">
			{#each Array(4) as _}
				<Card.Root>
					<Card.Content class="p-4">
						<Skeleton class="h-16 w-full" />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-4 gap-4">
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Services</p>
					<p class="text-2xl font-bold text-green-500">
						{services.filter(s => s.status === 'RUNNING').length}/{services.length}
					</p>
					<p class="text-xs text-muted-foreground mt-1">running</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Images</p>
					<p class="text-2xl font-bold text-accent-blue">{ciStatus?.images?.length ?? 0}</p>
					<p class="text-xs text-muted-foreground mt-1">managed</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">CI Builds</p>
					<p class="text-2xl font-bold text-accent-yellow">{ciStatus?.stats?.total ?? 0}</p>
					<p class="text-xs text-muted-foreground mt-1">total</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">Success Rate</p>
					<p class="text-2xl font-bold {(ciStatus?.stats?.successRate ?? 0) >= 80 ? 'text-green-500' : 'text-red-500'}">
						{ciStatus?.stats?.successRate ?? 0}%
					</p>
					<p class="text-xs text-muted-foreground mt-1">last 30 builds</p>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid grid-cols-3 gap-6">
			<div class="col-span-2 space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Service Status</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each services as service}
								<div class="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
									<span class="text-lg {service.status === 'RUNNING' ? 'text-green-500' : 'text-red-500'}">●</span>
									<div class="flex-1">
										<p class="text-sm font-medium">{service.name}</p>
										<p class="text-xs text-muted-foreground">
											Port {service.port}
											{#if service.pid}
												· PID {service.pid}
											{/if}
										</p>
									</div>
									<span class="text-xs {service.status === 'RUNNING' ? 'text-green-500' : 'text-red-500'}">
										{service.status}
									</span>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Recent Activity</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each parseActivities(commits) as activity}
								<div class="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
									<span class="text-lg">{activity.icon}</span>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium">{activity.title}</p>
										<p class="text-xs text-muted-foreground truncate">{activity.description}</p>
									</div>
									<div class="text-right">
										<code class="text-xs text-accent-yellow font-mono">{activity.commit.short}</code>
										<p class="text-xs text-muted-foreground">{formatTimeAgo(activity.commit.date)}</p>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm">Navigation</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each navCards as card}
								<a
									href={card.href}
									class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-all group"
								>
									<span class="text-xl">{card.icon}</span>
									<div class="flex-1">
										<p class="text-sm font-medium group-hover:text-accent-blue transition-colors">{card.label}</p>
										<p class="text-xs text-muted-foreground">{card.desc}</p>
									</div>
								</a>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				{#if ciStatus}
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-sm">Latest CI Build</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if ciStatus?.recentRuns && ciStatus.recentRuns.length > 0}
								{@const latest = ciStatus.recentRuns[0]}
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<span class="text-lg">
											{latest.status === 'in_progress' ? '⏳' : latest.conclusion === 'success' ? '✅' : latest.conclusion === 'failure' ? '❌' : '⚪'}
										</span>
										<span class="text-sm font-medium">#{latest.run_number}</span>
										<a href={latest.html_url} target="_blank" class="text-xs text-accent-blue hover:underline ml-auto">
											View ↗
										</a>
									</div>
									<p class="text-xs text-muted-foreground">
										{latest.head_branch} · {formatTimeAgo(latest.created_at)}
									</p>
									<p class="text-xs {latest.conclusion === 'success' ? 'text-green-500' : latest.conclusion === 'failure' ? 'text-red-500' : 'text-muted-foreground'}">
										{latest.conclusion || latest.status}
									</p>
								</div>
							{:else}
								<p class="text-xs text-muted-foreground">No builds yet</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	{/if}
</div>
