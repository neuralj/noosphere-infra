<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface ProxyRoute {
		address: string;
		handles: { match: string; upstream: string }[];
	}

	interface SiteFile {
		file: string;
		routes: ProxyRoute[];
	}

	let siteFiles = $state<SiteFile[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const res = await fetch('/api/proxy');
		const data = await res.json();
		siteFiles = data.siteFiles || [];
		loading = false;
	});
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Proxy Routes</h1>
		<p class="text-muted-foreground mt-1">Caddy reverse proxy virtual hosts and upstream mappings</p>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-8 w-48" />
			<Skeleton class="h-48 w-full" />
			<Skeleton class="h-48 w-full" />
		</div>
	{:else}
		{#each siteFiles as sf}
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-mono text-sm text-accent-yellow">{sf.file}</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each sf.routes as route}
						<Card.Root size="sm">
							<Card.Content class="p-4">
								<div class="flex items-center gap-3 mb-3">
									<span class="text-lg">🌐</span>
									<div>
										<Card.Title class="font-mono text-accent-blue">{route.address}</Card.Title>
									</div>
								</div>
								{#if route.handles.length > 0}
									<table class="w-full text-sm">
										<thead>
											<tr class="text-muted-foreground text-xs uppercase">
												<th class="text-left pb-2 font-medium">Match</th>
												<th class="text-left pb-2 font-medium">Upstream</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-border/50">
											{#each route.handles as handle}
												<tr>
													<td class="py-1.5 font-mono text-xs">{handle.match}</td>
													<td class="py-1.5 font-mono text-xs text-accent-green">{handle.upstream}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{:else}
									<p class="text-xs text-muted-foreground">No upstreams defined</p>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
