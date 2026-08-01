<script lang="ts">
	import { onMount } from 'svelte';
	import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
	import ImageStats from '$lib/components/ImageStats.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface ImageInfo {
		name: string;
		fromImage: string;
		ports: string[];
		description: string;
		dockerfile: string;
		stats: {
			lines: number;
			runCount: number;
			envCount: number;
			copyCount: number;
			argCount: number;
			multiStage: boolean;
			hasHealthcheck: boolean;
			hasEntrypoint: boolean;
			complexity: 'simple' | 'moderate' | 'complex';
		};
		pullCommand: string;
		mirrorPullCommand: string;
		isInternal: boolean;
		dependsOn: string[];
	}

	interface BuildInfo {
		status: string;
		conclusion: string | null;
		runNumber: number;
		time: string;
		htmlUrl: string;
	}

	let images = $state<ImageInfo[]>([]);
	let loading = $state(true);
	let mermaidCode = $state('');
	let buildMap = $state<Map<string, BuildInfo>>(new Map());
	let selectedImage = $state<ImageInfo | null>(null);
	let copiedCommand = $state('');

	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedCommand = label;
			setTimeout(() => { copiedCommand = ''; }, 2000);
		} catch {
			// fallback
		}
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

	async function fetchBuildStatus() {
		try {
			const res = await fetch('/api/ci?action=runs');
			const runs = await res.json();
			const map = new Map<string, BuildInfo>();

			const latestCompletedRun = runs.find(
				(r: any) => r.conclusion === 'success' || r.conclusion === 'failure'
			);

			if (latestCompletedRun) {
				const res2 = await fetch(`/api/ci?action=jobs&run_id=${latestCompletedRun.id}`);
				const jobs = await res2.json();

				for (const job of jobs) {
					if (job.name.startsWith('build (')) {
						const match = job.name.match(/build \(([^,]+)/);
						if (match) {
							const imageName = match[1];
							map.set(imageName, {
								status: latestCompletedRun.status,
								conclusion: latestCompletedRun.conclusion,
								runNumber: latestCompletedRun.run_number,
								time: formatTimeAgo(latestCompletedRun.created_at),
								htmlUrl: latestCompletedRun.html_url
							});
						}
					}
				}
			}
			buildMap = map;
		} catch (e) {
			console.error('Failed to fetch build status:', e);
		}
	}

	onMount(async () => {
		const [imagesRes] = await Promise.all([
			fetch('/api/images'),
			fetchBuildStatus()
		]);
		const data = await imagesRes.json();
		images = data.images || [];
		buildGraph();
		loading = false;
	});

	function buildGraph() {
		const lines = ['graph TD'];
		const internalNames = new Set(images.map((i) => i.name));

		for (const img of images) {
			const fromBase = img.fromImage.split(':')[0].split('/').pop() || img.fromImage;
			if (internalNames.has(fromBase)) {
				lines.push(`    ${fromBase} --> ${img.name}`);
			} else {
				lines.push(`    ${img.name}_base["${img.fromImage}"] --> ${img.name}`);
			}
		}

		lines.push('');
		lines.push('    classDef internal fill:#2a2a3e,stroke:#3b82f6,color:#cdd6f4');
		lines.push('    classDef external fill:#1e1e2e,stroke:#7f849c,color:#7f849c,stroke-dasharray: 5 5');

		for (const img of images) {
			lines.push(`    class ${img.name} internal`);
			const fromBase = img.fromImage.split(':')[0].split('/').pop() || img.fromImage;
			if (!internalNames.has(fromBase)) {
				lines.push(`    class ${img.name}_base external`);
			}
		}

		mermaidCode = lines.join('\n');
	}

	function getBuildStatusIcon(imageName: string): string {
		const build = buildMap.get(imageName);
		if (!build) return '⚪';
		if (build.conclusion === 'success') return '✅';
		if (build.conclusion === 'failure') return '❌';
		return '⏳';
	}

	function getBuildStatusColor(imageName: string): string {
		const build = buildMap.get(imageName);
		if (!build) return 'text-muted-foreground';
		if (build.conclusion === 'success') return 'text-green-500';
		if (build.conclusion === 'failure') return 'text-red-500';
		return 'text-accent-yellow';
	}
</script>

<div class="p-6 max-w-full mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-accent-blue">Docker Images</h1>
			<p class="text-muted-foreground mt-1">{images.length} images · ghcr.io/neuralj</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Dependency Graph</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<Skeleton class="h-48 w-full" />
			{:else}
				<MermaidDiagram code={mermaidCode} />
			{/if}
		</Card.Content>
	</Card.Root>

	{#if !loading}
		<div>
			<h2 class="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Statistics</h2>
			<div class="mt-3">
				<ImageStats {images} />
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each images as img}
			<Card.Root class="cursor-pointer hover:border-accent-blue/50 transition-colors" onclick={() => selectedImage = img}>
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-lg">🐳</span>
							<Card.Title class="text-accent-blue">{img.name}</Card.Title>
						</div>
						<span class="text-sm" title="Last build status">
							{getBuildStatusIcon(img.name)}
						</span>
					</div>

					<div class="mt-3 space-y-2 text-sm">
						<div>
							<span class="text-muted-foreground text-xs uppercase">Base Image</span>
							<p class="font-mono text-xs text-accent-yellow">{img.fromImage}</p>
						</div>

						{#if img.ports.length > 0}
							<div>
								<span class="text-muted-foreground text-xs uppercase">Ports</span>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each img.ports as port}
										<span class="px-2 py-0.5 bg-muted rounded text-xs font-mono text-accent-green">{port}</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="flex items-center gap-2 text-xs">
							<span class="px-2 py-0.5 rounded {img.stats.complexity === 'simple' ? 'bg-green-500/20 text-green-500' : img.stats.complexity === 'moderate' ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-red-500/20 text-red-500'}">
								{img.stats.complexity}
							</span>
							<span class="text-muted-foreground">{img.stats.lines} lines</span>
							{#if img.stats.multiStage}
								<span class="text-muted-foreground">· multi-stage</span>
							{/if}
						</div>

						{#if img.dependsOn.length > 0}
							<div class="flex items-center gap-1 text-xs text-muted-foreground">
								<span>depends on:</span>
								{#each img.dependsOn as dep}
									<span class="font-mono text-accent-blue">{dep}</span>
								{/each}
							</div>
						{/if}

						{#if buildMap.get(img.name)}
							{@const build = buildMap.get(img.name)}
							<div class="flex items-center gap-2 text-xs">
								<span class={getBuildStatusColor(img.name)}>
									{build.conclusion}
								</span>
								<span class="text-muted-foreground">#{build.runNumber} · {build.time}</span>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>

{#if selectedImage}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onclick={() => selectedImage = null} role="button" tabindex="-1">
		<div class="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onclick={(e) => e.stopPropagation()} role="button" tabindex="0">
			<div class="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="text-2xl">🐳</span>
					<h2 class="text-xl font-bold text-accent-blue">{selectedImage.name}</h2>
					<span class="text-sm" title="Last build status">
						{getBuildStatusIcon(selectedImage.name)}
					</span>
				</div>
				<button class="text-muted-foreground hover:text-foreground" onclick={() => selectedImage = null}>✕</button>
			</div>

			<div class="p-6 space-y-6">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<h3 class="text-sm font-semibold text-muted-foreground uppercase mb-2">Base Image</h3>
						<p class="font-mono text-sm text-accent-yellow">{selectedImage.fromImage}</p>
					</div>
					<div>
						<h3 class="text-sm font-semibold text-muted-foreground uppercase mb-2">Ports</h3>
						<div class="flex flex-wrap gap-2">
							{#each selectedImage.ports as port}
								<span class="px-2 py-1 bg-muted rounded text-sm font-mono text-accent-green">{port}</span>
							{:else}
								<span class="text-sm text-muted-foreground">None</span>
							{/each}
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-muted-foreground uppercase mb-2">Pull Commands</h3>
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<code class="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono">{selectedImage.pullCommand}</code>
							<Button size="sm" onclick={() => copyToClipboard(selectedImage.pullCommand, 'pull')}>
								{copiedCommand === 'pull' ? '✓' : 'Copy'}
							</Button>
						</div>
						<div class="flex items-center gap-2">
							<code class="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono">{selectedImage.mirrorPullCommand}</code>
							<Button size="sm" onclick={() => copyToClipboard(selectedImage.mirrorPullCommand, 'mirror')}>
								{copiedCommand === 'mirror' ? '✓' : 'Copy'}
							</Button>
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-muted-foreground uppercase mb-2">Statistics</h3>
					<div class="grid grid-cols-4 gap-4 text-sm">
						<div>
							<span class="text-muted-foreground">Lines:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.lines}</span>
						</div>
						<div>
							<span class="text-muted-foreground">RUN:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.runCount}</span>
						</div>
						<div>
							<span class="text-muted-foreground">ENV:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.envCount}</span>
						</div>
						<div>
							<span class="text-muted-foreground">COPY:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.copyCount}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Complexity:</span>
							<span class="ml-2 font-mono capitalize">{selectedImage.stats.complexity}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Multi-stage:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.multiStage ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Healthcheck:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.hasHealthcheck ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Entrypoint:</span>
							<span class="ml-2 font-mono">{selectedImage.stats.hasEntrypoint ? 'Yes' : 'No'}</span>
						</div>
					</div>
				</div>

				{#if selectedImage.dependsOn.length > 0}
					<div>
						<h3 class="text-sm font-semibold text-muted-foreground uppercase mb-2">Dependencies</h3>
						<div class="flex flex-wrap gap-2">
							{#each selectedImage.dependsOn as dep}
								<span class="px-3 py-1 bg-accent-blue/20 rounded text-sm font-mono text-accent-blue">{dep}</span>
							{/each}
						</div>
					</div>
				{/if}

				<div>
					<h3 class="text-sm font-semibold text-muted-foreground uppercase mb-2">Dockerfile</h3>
					<pre class="p-4 bg-muted rounded text-xs font-mono overflow-auto max-h-96">{selectedImage.dockerfile}</pre>
				</div>
			</div>
		</div>
	</div>
{/if}
