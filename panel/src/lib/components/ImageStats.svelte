<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	interface ImageStatEntry {
		name: string;
		fromImage: string;
		ports: string[];
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

	let { images = [] }: { images: ImageStatEntry[] } = $props();

	type SortKey = 'name' | 'lines' | 'runCount' | 'complexity';
	let sortKey = $state<SortKey>('lines');
	let sortAsc = $state(false);

	const complexityOrder = { simple: 0, moderate: 1, complex: 2 };

	let sorted = $derived.by(() => {
		const copy = [...images];
		copy.sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortKey === 'complexity')
				cmp = complexityOrder[a.stats.complexity] - complexityOrder[b.stats.complexity];
			else cmp = a.stats[sortKey] - b.stats[sortKey];
			return sortAsc ? cmp : -cmp;
		});
		return copy;
	});

	let totalLines = $derived(images.reduce((s, i) => s + i.stats.lines, 0));
	let totalLayers = $derived(images.reduce((s, i) => s + i.stats.runCount, 0));
	let simpleCount = $derived(images.filter((i) => i.stats.complexity === 'simple').length);
	let moderateCount = $derived(images.filter((i) => i.stats.complexity === 'moderate').length);
	let complexCount = $derived(images.filter((i) => i.stats.complexity === 'complex').length);
	let maxLines = $derived(Math.max(...images.map((i) => i.stats.lines), 1));

	let baseImageMap = $derived.by(() => {
		const map = new Map<string, number>();
		for (const img of images) {
			const base = img.fromImage.split(':')[0];
			map.set(base, (map.get(base) || 0) + 1);
		}
		return [...map.entries()].sort((a, b) => b[1] - a[1]);
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = false;
		}
	}

	function sortIndicator(key: SortKey): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' ↑' : ' ↓';
	}

	const complexityColor: Record<string, string> = {
		simple: 'text-accent-green bg-accent-green/10',
		moderate: 'text-accent-yellow bg-accent-yellow/10',
		complex: 'text-accent-red bg-accent-red/10'
	};
</script>

<div class="space-y-6">
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Total Images</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-mono text-accent-blue">{images.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Total Lines</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-mono text-accent-yellow">{totalLines}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Total Layers</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-mono text-accent-green">{totalLayers}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Complexity</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex gap-2">
					<span class="px-2 py-0.5 rounded text-xs font-mono {complexityColor.simple}">{simpleCount}</span>
					<span class="px-2 py-0.5 rounded text-xs font-mono {complexityColor.moderate}">{moderateCount}</span>
					<span class="px-2 py-0.5 rounded text-xs font-mono {complexityColor.complex}">{complexCount}</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Per-Image Breakdown</Card.Title>
		</Card.Header>
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="text-muted-foreground text-xs uppercase">
						<Table.Head class="cursor-pointer hover:text-foreground" onclick={() => toggleSort('name')}>
							Image{sortIndicator('name')}
						</Table.Head>
						<Table.Head class="text-right cursor-pointer hover:text-foreground" onclick={() => toggleSort('lines')}>
							Lines{sortIndicator('lines')}
						</Table.Head>
						<Table.Head class="text-right cursor-pointer hover:text-foreground" onclick={() => toggleSort('runCount')}>
							RUN{sortIndicator('runCount')}
						</Table.Head>
						<Table.Head class="text-right">ENV</Table.Head>
						<Table.Head class="text-right">COPY</Table.Head>
						<Table.Head class="text-center">Flags</Table.Head>
						<Table.Head class="text-center cursor-pointer hover:text-foreground" onclick={() => toggleSort('complexity')}>
							Complexity{sortIndicator('complexity')}
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each sorted as img}
						<Table.Row class="hover:bg-muted/50">
							<Table.Cell class="font-mono text-accent-blue text-xs">{img.name}</Table.Cell>
							<Table.Cell class="text-right font-mono text-xs">
								<div class="flex items-center justify-end gap-2">
									<div class="w-16 h-1.5 bg-background rounded-full overflow-hidden">
										<div
											class="h-full bg-accent-yellow/60 rounded-full"
											style="width: {(img.stats.lines / maxLines) * 100}%"
										></div>
									</div>
									<span>{img.stats.lines}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="text-right font-mono text-xs text-accent-green">{img.stats.runCount}</Table.Cell>
							<Table.Cell class="text-right font-mono text-xs text-muted-foreground">{img.stats.envCount}</Table.Cell>
							<Table.Cell class="text-right font-mono text-xs text-muted-foreground">{img.stats.copyCount}</Table.Cell>
							<Table.Cell>
								<div class="flex items-center justify-center gap-1">
									{#if img.stats.multiStage}
										<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-purple/15 text-accent-purple" title="Multi-stage build">MS</span>
									{/if}
									{#if img.stats.hasHealthcheck}
										<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-green/15 text-accent-green" title="Has HEALTHCHECK">HC</span>
									{/if}
									{#if img.stats.hasEntrypoint}
										<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-teal/15 text-accent-teal" title="Has ENTRYPOINT">EP</span>
									{/if}
									{#if img.ports.length > 0}
										<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-yellow/15 text-accent-yellow" title="Exposed ports">PT</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="text-center">
								<span class="px-2 py-0.5 rounded text-xs font-mono {complexityColor[img.stats.complexity]}">
									{img.stats.complexity}
								</span>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Base Image Distribution</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-2">
				{#each baseImageMap as [base, count]}
					{@const pct = (count / images.length) * 100}
					<div class="flex items-center gap-3">
						<code class="text-xs text-accent-yellow w-48 shrink-0 truncate" title={base}>{base}</code>
						<div class="flex-1 h-4 bg-background rounded overflow-hidden">
							<div
								class="h-full bg-accent-blue/30 rounded"
								style="width: {pct}%"
							></div>
						</div>
						<span class="text-xs font-mono text-muted-foreground w-6 text-right">{count}</span>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>
