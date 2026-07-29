<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	const jobs = [
		{
			name: 'changes',
			description: 'Detect which images changed using dorny/paths-filter',
			icon: '🔍',
			color: 'text-accent-yellow'
		},
		{
			name: 'build',
			description: 'Matrix build: AMD64 + ARM64 for each changed image',
			icon: '🔨',
			color: 'text-accent-blue',
			details: [
				'Runs on ubuntu-latest (amd64) and ubuntu-24.04-arm (arm64)',
				'Pushes arch-specific tags: latest-amd64, latest-arm64, <sha>-amd64, <sha>-arm64',
				'Uses GHCR_PAT secret for authentication'
			]
		},
		{
			name: 'merge-manifests',
			description: 'Combine arch-specific tags into multi-arch manifests',
			icon: '🔀',
			color: 'text-accent-green',
			details: ['Creates unified latest and <sha-short> tags', 'Depends on: build job completion']
		}
	];

	const images = [
		'devshell',
		'postgres',
		'webtest',
		'ollama',
		'mineru',
		'mongodb',
		'grafana',
		'qdrant',
		'openworker-next',
		'a-bulletin',
		'a-market'
	];

	const triggers = [
		{ pattern: 'images/**', desc: 'Any image directory changes' },
		{ pattern: '.github/workflows/**', desc: 'Workflow file changes' },
		{ pattern: 'workflow_dispatch', desc: 'Manual trigger' }
	];
</script>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">CI/CD Pipeline</h1>
		<p class="text-muted-foreground mt-1">GitHub Actions workflow: build.yml</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Triggers</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-2">
				{#each triggers as t}
					<div class="bg-background rounded-lg px-3 py-2 border border-border">
						<code class="text-xs text-accent-yellow">{t.pattern}</code>
						<p class="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Pipeline Flow</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-4 overflow-x-auto pb-2">
				{#each jobs as job, i}
					<div class="bg-background rounded-lg border border-border p-4 min-w-[200px] shrink-0">
						<div class="flex items-center gap-2 mb-2">
							<span class="text-lg">{job.icon}</span>
							<h3 class="font-semibold {job.color}">{job.name}</h3>
						</div>
						<p class="text-xs text-muted-foreground">{job.description}</p>
						{#if job.details}
							<ul class="mt-2 space-y-1">
								{#each job.details as detail}
									<li class="text-xs text-muted-foreground flex items-start gap-1">
										<span class="text-accent-blue mt-0.5">•</span>
										<span>{detail}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
					{#if i < jobs.length - 1}
						<span class="text-2xl text-muted-foreground shrink-0">→</span>
					{/if}
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Managed Images ({images.length})</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-2">
				{#each images as img}
					<span class="px-3 py-1.5 bg-background rounded-lg border border-border text-sm font-mono text-accent-blue">{img}</span>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Registry</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-2 text-sm">
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground">Source:</span>
					<code class="text-accent-yellow">ghcr.io/neuralj/&lt;name&gt;:&lt;tag&gt;</code>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground">Mirror:</span>
					<code class="text-accent-green">ghcr.nju.edu.cn/neuralj/&lt;name&gt;:&lt;tag&gt;</code>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
