<script lang="ts">
	import { onMount } from 'svelte';
	import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
	import ImageStats from '$lib/components/ImageStats.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface ImageInfo {
		name: string;
		fromImage: string;
		ports: string[];
		description: string;
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
	}

	let images = $state<ImageInfo[]>([]);
	let loading = $state(true);
	let mermaidCode = $state('');

	onMount(async () => {
		const res = await fetch('/api/images');
		const data = await res.json();
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
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Docker Images</h1>
		<p class="text-muted-foreground mt-1">Image dependency topology and metadata</p>
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
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-2">
						<span class="text-lg">🐳</span>
						<Card.Title class="text-accent-blue">{img.name}</Card.Title>
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
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
