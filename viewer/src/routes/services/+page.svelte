<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface ServiceInfo {
		name: string;
		status: 'running' | 'stopped';
		port: number;
		pid: number | null;
		logTail: string[];
	}

	let services = $state<ServiceInfo[]>([]);
	let loading = $state(true);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	async function fetchServices() {
		try {
			const res = await fetch('/api/services');
			const data = await res.json();
			services = data.services || [];
		} catch {
			// keep previous data on error
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchServices();
		intervalId = setInterval(fetchServices, 5000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Services</h1>
		<p class="text-muted-foreground mt-1">Local service status and health</p>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-8 w-48" />
			<Skeleton class="h-48 w-full" />
			<Skeleton class="h-48 w-full" />
		</div>
	{:else}
		<div class="space-y-4">
			{#each services as service}
				<Card.Root>
					<Card.Content class="p-5">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-3">
								<span class="text-lg {service.status === 'running' ? 'text-green-500' : 'text-red-500'}">●</span>
								<Card.Title class="font-mono">{service.name}</Card.Title>
							</div>
							<span class="text-sm font-mono {service.status === 'running' ? 'text-green-500' : 'text-red-500'}">
								{service.status}
							</span>
						</div>

						<div class="grid grid-cols-2 gap-4 text-sm mb-4">
							<div>
								<span class="text-muted-foreground">Port:</span>
								<span class="font-mono ml-2">{service.port}</span>
							</div>
							<div>
								<span class="text-muted-foreground">PID:</span>
								<span class="font-mono ml-2">{service.pid ?? '-'}</span>
							</div>
						</div>

						{#if service.logTail.length > 0}
							<div class="border-t border-border pt-3">
								<p class="text-xs text-muted-foreground mb-2">Recent logs</p>
								<div class="bg-muted rounded p-3 max-h-48 overflow-auto">
									<pre class="text-xs font-mono text-foreground/80 whitespace-pre-wrap">{service.logTail.join('\n')}</pre>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
