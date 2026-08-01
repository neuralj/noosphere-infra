<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	interface ServiceInfo {
		name: string;
		status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'BACKOFF' | 'FATAL' | 'EXITED';
		port: number;
		pid: number | null;
		uptime: string;
		command: string;
		directory: string;
		logFile: string;
		logTail: string[];
	}

	interface CaddySite {
		name: string;
		domains: string[];
		backends: string[];
	}

	let services = $state<ServiceInfo[]>([]);
	let caddySites = $state<CaddySite[]>([]);
	let loading = $state(true);
	let caddyLoading = $state(true);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let actionInProgress = $state<Record<string, boolean>>({});
	let caddyReloading = $state(false);
	let caddyReloadMsg = $state('');

	async function fetchServices() {
		try {
			const res = await fetch('/api/services');
			const data = await res.json();
			services = data.services || [];
		} catch {
		} finally {
			loading = false;
		}
	}

	async function fetchCaddy() {
		try {
			const res = await fetch('/api/caddy');
			const data = await res.json();
			caddySites = data.sites || [];
		} catch {
		} finally {
			caddyLoading = false;
		}
	}

	async function serviceAction(name: string, action: string) {
		const key = `${name}-${action}`;
		actionInProgress = { ...actionInProgress, [key]: true };
		try {
			await fetch(`/api/services?action=${action}&label=${name}`, { method: 'POST' });
			await fetchServices();
		} finally {
			actionInProgress = { ...actionInProgress, [key]: false };
		}
	}

	async function reloadCaddy() {
		caddyReloading = true;
		caddyReloadMsg = '';
		try {
			const res = await fetch('/api/caddy?action=reload', { method: 'POST' });
			const data = await res.json();
			if (data.success) {
				caddyReloadMsg = 'Reloaded successfully';
			} else {
				caddyReloadMsg = `Error: ${data.error}`;
			}
		} catch (e) {
			caddyReloadMsg = `Error: ${String(e)}`;
		} finally {
			caddyReloading = false;
			setTimeout(() => (caddyReloadMsg = ''), 5000);
		}
	}

	onMount(() => {
		fetchServices();
		fetchCaddy();
		intervalId = setInterval(fetchServices, 5000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Services</h1>
		<p class="text-muted-foreground mt-1">Local service status and Caddy reverse proxy</p>
	</div>

	<Tabs value="services">
		<TabsList>
			<TabsTrigger value="services">Services</TabsTrigger>
			<TabsTrigger value="caddy">Caddy</TabsTrigger>
		</TabsList>

		<TabsContent value="services">
			{#if loading}
				<div class="space-y-4 mt-4">
					<Skeleton class="h-48 w-full" />
					<Skeleton class="h-48 w-full" />
				</div>
			{:else}
				<div class="space-y-4 mt-4">
					{#each services as service}
						<Card.Root>
							<Card.Content class="p-5">
								<div class="flex items-center justify-between mb-3">
									<div class="flex items-center gap-3">
										<span class="text-lg {service.status === 'RUNNING' ? 'text-green-500' : 'text-red-500'}">●</span>
										<Card.Title class="font-mono">{service.name}</Card.Title>
									</div>
									<div class="flex items-center gap-2">
										<Badge variant={service.status === 'RUNNING' ? 'default' : 'destructive'}>
											{service.status}
										</Badge>
										{#if service.status === 'RUNNING'}
											<Button
												size="xs"
												variant="outline"
												disabled={actionInProgress[`${service.name}-restart`]}
												onclick={() => serviceAction(service.name, 'restart')}
											>
												{actionInProgress[`${service.name}-restart`] ? 'Restarting...' : 'Restart'}
											</Button>
											<Button
												size="xs"
												variant="destructive"
												disabled={actionInProgress[`${service.name}-stop`]}
												onclick={() => serviceAction(service.name, 'stop')}
											>
												{actionInProgress[`${service.name}-stop`] ? 'Stopping...' : 'Stop'}
											</Button>
										{:else}
											<Button
												size="xs"
												variant="default"
												disabled={actionInProgress[`${service.name}-start`]}
												onclick={() => serviceAction(service.name, 'start')}
											>
												{actionInProgress[`${service.name}-start`] ? 'Starting...' : 'Start'}
											</Button>
										{/if}
									</div>
								</div>

								<div class="grid grid-cols-3 gap-4 text-sm mb-3">
									<div>
										<span class="text-muted-foreground">Port:</span>
										<span class="font-mono ml-2">{service.port}</span>
									</div>
									<div>
										<span class="text-muted-foreground">PID:</span>
										<span class="font-mono ml-2">{service.pid ?? '-'}</span>
									</div>
									<div>
										<span class="text-muted-foreground">Uptime:</span>
										<span class="font-mono ml-2">{service.uptime}</span>
									</div>
								</div>

								<details class="group">
									<summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
										<span class="group-open:hidden">▸</span>
										<span class="hidden group-open:inline">▾</span>
										Configuration
									</summary>
									<div class="mt-2 space-y-1 text-sm pl-4 border-l border-border">
										<div class="break-all">
											<span class="text-muted-foreground">Command:</span>
											<code class="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">{service.command}</code>
										</div>
										<div class="break-all">
											<span class="text-muted-foreground">Directory:</span>
											<code class="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">{service.directory}</code>
										</div>
										<div class="break-all">
											<span class="text-muted-foreground">Log File:</span>
											<code class="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">{service.logFile}</code>
										</div>
									</div>
								</details>

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
		</TabsContent>

		<TabsContent value="caddy">
			<div class="mt-4">
				<div class="flex items-center justify-between mb-4">
					<p class="text-sm text-muted-foreground">Reverse proxy site mappings</p>
					<div class="flex items-center gap-2">
						{#if caddyReloadMsg}
							<span class="text-xs {caddyReloadMsg.startsWith('Error') ? 'text-red-500' : 'text-green-500'}">
								{caddyReloadMsg}
							</span>
						{/if}
						<Button size="sm" variant="outline" disabled={caddyReloading} onclick={reloadCaddy}>
							{caddyReloading ? 'Reloading...' : 'Reload Caddy'}
						</Button>
					</div>
				</div>

				{#if caddyLoading}
					<div class="space-y-4">
						<Skeleton class="h-32 w-full" />
						<Skeleton class="h-32 w-full" />
					</div>
				{:else}
					<div class="space-y-4">
						{#each caddySites as site}
							<Card.Root>
								<Card.Content class="p-5">
									<Card.Title class="font-mono text-sm mb-3">{site.name}</Card.Title>
									<div class="space-y-2">
										<div>
											<span class="text-xs text-muted-foreground">Domains:</span>
											<div class="flex flex-wrap gap-1 mt-1">
												{#each site.domains as domain}
													<span class="inline-block bg-primary/10 text-accent-blue text-xs font-mono px-2 py-0.5 rounded">
														{domain}
													</span>
												{/each}
											</div>
										</div>
										<div>
											<span class="text-xs text-muted-foreground">Backends:</span>
											<div class="flex flex-wrap gap-1 mt-1">
												{#each site.backends as backend}
													<span class="inline-block bg-muted text-foreground text-xs font-mono px-2 py-0.5 rounded">
														{backend}
													</span>
												{/each}
											</div>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</div>
		</TabsContent>
	</Tabs>
</div>
