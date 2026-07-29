<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface NginxRoute {
		serverName: string;
		listen: string;
		locations: { path: string; proxyPass: string }[];
	}

	interface ConfFile {
		file: string;
		routes: NginxRoute[];
	}

	let confFiles = $state<ConfFile[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const res = await fetch('/api/nginx');
		const data = await res.json();
		confFiles = data.confFiles || [];
		loading = false;
	});
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Nginx Routes</h1>
		<p class="text-muted-foreground mt-1">Reverse proxy virtual hosts and upstream mappings</p>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-8 w-48" />
			<Skeleton class="h-48 w-full" />
			<Skeleton class="h-48 w-full" />
		</div>
	{:else}
		{#each confFiles as cf}
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-mono text-sm text-accent-yellow">{cf.file}</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each cf.routes as route}
						<Card.Root size="sm">
							<Card.Content class="p-4">
								<div class="flex items-center gap-3 mb-3">
									<span class="text-lg">🌐</span>
									<div>
										<Card.Title class="font-mono text-accent-blue">{route.serverName}</Card.Title>
										<p class="text-xs text-muted-foreground">listen {route.listen}</p>
									</div>
								</div>
								{#if route.locations.length > 0}
									<table class="w-full text-sm">
										<thead>
											<tr class="text-muted-foreground text-xs uppercase">
												<th class="text-left pb-2 font-medium">Path</th>
												<th class="text-left pb-2 font-medium">Proxy Pass</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-border/50">
											{#each route.locations as loc}
												<tr>
													<td class="py-1.5 font-mono text-xs">{loc.path}</td>
													<td class="py-1.5 font-mono text-xs text-accent-green">{loc.proxyPass}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{:else}
									<p class="text-xs text-muted-foreground">No proxy locations defined</p>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
