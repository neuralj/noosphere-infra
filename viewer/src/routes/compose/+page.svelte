<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface Service {
		name: string;
		image: string;
		ports: string[];
		volumes: string[];
		network_mode: string;
		profiles: string[];
		depends_on: string[];
		environment: Record<string, string>;
	}

	interface ComposeFile {
		file: string;
		services: Service[];
	}

	let composeFiles = $state<ComposeFile[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const res = await fetch('/api/compose');
		const data = await res.json();
		composeFiles = data.composeFiles || [];
		loading = false;
	});
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Docker Compose</h1>
		<p class="text-muted-foreground mt-1">Service definitions and configuration</p>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-8 w-48" />
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-32 w-full" />
		</div>
	{:else}
		{#each composeFiles as cf}
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-mono text-sm text-accent-yellow">{cf.file}</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each cf.services as svc}
							<Card.Root size="sm">
								<Card.Content class="p-4">
									<div class="flex items-center justify-between">
										<Card.Title class="text-accent-blue">{svc.name}</Card.Title>
										{#if svc.profiles.length > 0}
											<div class="flex gap-1">
												{#each svc.profiles as profile}
													<span class="px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded text-xs">{profile}</span>
												{/each}
											</div>
										{/if}
									</div>
									<div class="mt-3 space-y-2 text-sm">
										{#if svc.image}
											<div>
												<span class="text-muted-foreground text-xs uppercase">Image</span>
												<p class="font-mono text-xs text-accent-yellow">{svc.image}</p>
											</div>
										{/if}
										{#if svc.ports.length > 0}
											<div>
												<span class="text-muted-foreground text-xs uppercase">Ports</span>
												<div class="flex flex-wrap gap-1 mt-1">
													{#each svc.ports as port}
														<span class="px-2 py-0.5 bg-muted rounded text-xs font-mono text-accent-green">{port}</span>
													{/each}
												</div>
											</div>
										{/if}
										{#if svc.network_mode}
											<div>
												<span class="text-muted-foreground text-xs uppercase">Network</span>
												<p class="font-mono text-xs">{svc.network_mode}</p>
											</div>
										{/if}
										{#if svc.volumes.length > 0}
											<div>
												<span class="text-muted-foreground text-xs uppercase">Volumes</span>
												<ul class="mt-1 space-y-0.5">
													{#each svc.volumes as vol}
														<li class="font-mono text-xs text-muted-foreground truncate">{vol}</li>
													{/each}
												</ul>
											</div>
										{/if}
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
