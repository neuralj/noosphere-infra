<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import MarkdownView from '$lib/components/MarkdownView.svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';

	type PackFormat = 'markdown' | 'single' | 'jsonl' | 'xml';
	type PackProfile = 'review' | 'rag' | 'finetune' | 'context';

	interface StatsResult {
		root: string;
		model: string;
		files: number;
		totalTokens: number;
		maxTokens: number;
		estimatedSegments: number;
		largest: { path: string; tokens: number }[];
		skippedLarge?: string[];
	}

	interface PackSummary {
		format: string;
		files: number;
		totalTokens: number;
		segments: number;
		outputs: string[];
		skippedLarge?: string[];
	}

	interface OutputFile {
		name: string;
		size: number;
		mtime: string;
	}

	interface ProjectDir {
		name: string;
		mtime: string;
		manifest: {
			project: string;
			model: string;
			format: string;
			profile: string;
			files: number;
			total_tokens: number;
			segments: number;
		} | null;
	}

	interface Finding {
		level: 'BUG' | 'SUGGESTION' | 'WARN';
		filepath: string;
		line: number;
		msg: string;
	}

	const PROFILE_DEFAULTS: Record<PackProfile, { format: PackFormat; maxTokens: number; model: string }> = {
		review: { format: 'markdown', maxTokens: 100000, model: 'gpt-4o' },
		rag: { format: 'jsonl', maxTokens: 8000, model: 'text-embedding-3-small' },
		finetune: { format: 'jsonl', maxTokens: 6000, model: 'gpt-4o-mini' },
		context: { format: 'xml', maxTokens: 150000, model: 'claude-3-5-sonnet' }
	};

	let repoRoot = $state('');
	let allowedDirs = $state<string[]>([]);
	let path = $state('');
	let profile = $state<PackProfile>('review');
	let format = $state<PackFormat>('markdown');
	let model = $state('gpt-4o');
	let maxTokens = $state('100000');
	let includeStr = $state('');
	let excludeStr = $state('');

	let statsResult = $state<StatsResult | null>(null);
	let treeResult = $state<{ tree: string; files: number } | null>(null);
	let packResult = $state<PackSummary | null>(null);
	let currentProject = $state('');
	let projectFiles = $state<OutputFile[]>([]);
	let selectedFile = $state('');
	let selectedContent = $state('');

	let history = $state<ProjectDir[]>([]);
	let historyFiles = $state<OutputFile[]>([]);
	let historyProject = $state('');
	let keepMax = $state(30);
	let cleanupMessage = $state('');

	let reviewText = $state('');
	let findings = $state<Finding[]>([]);
	let applyStats = $state<{ applied: number; skipped: number; filesModified: string[] } | null>(null);
	let applyMessage = $state('');

	let loadingRoots = $state(true);
	let loadingStats = $state(false);
	let loadingTree = $state(false);
	let loadingPack = $state(false);
	let loadingOutputs = $state(false);
	let loadingContent = $state(false);
	let loadingHistory = $state(false);
	let error = $state('');

	function onProfileChange() {
		const d = PROFILE_DEFAULTS[profile];
		format = d.format;
		model = d.model;
		maxTokens = String(d.maxTokens);
	}

	async function fetchRoots() {
		try {
			const res = await fetch('/api/pack?action=roots');
			const data = await res.json();
			repoRoot = data.repoRoot || '';
			allowedDirs = data.allowed || [repoRoot].filter(Boolean);
			if (allowedDirs.length > 0) path = allowedDirs[0];
		} catch (e) {
			error = `Failed to load roots: ${String(e)}`;
		} finally {
			loadingRoots = false;
		}
	}

	function packQuery(): string {
		const params = new URLSearchParams();
		if (path) params.set('path', path);
		if (model) params.set('model', model);
		if (maxTokens) params.set('maxTokens', maxTokens);
		if (includeStr) params.set('include', includeStr);
		if (excludeStr) params.set('exclude', excludeStr);
		return params.toString();
	}

	function splitGlobs(raw: string): string[] {
		return raw
			.split(',')
			.map(s => s.trim())
			.filter(Boolean);
	}

	async function runStats() {
		error = '';
		loadingStats = true;
		statsResult = null;
		try {
			const res = await fetch(`/api/pack?action=stats&${packQuery()}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Stats failed');
			statsResult = data.stats;
		} catch (e) {
			error = String(e);
		} finally {
			loadingStats = false;
		}
	}

	async function runTree() {
		error = '';
		loadingTree = true;
		treeResult = null;
		try {
			const res = await fetch(`/api/pack?action=tree&${packQuery()}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Tree failed');
			treeResult = data;
		} catch (e) {
			error = String(e);
		} finally {
			loadingTree = false;
		}
	}

	async function runPack() {
		error = '';
		loadingPack = true;
		packResult = null;
		selectedFile = '';
		try {
			const res = await fetch('/api/pack', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'pack',
					path,
					format,
					profile,
					model,
					maxTokens: maxTokens || undefined,
					include: splitGlobs(includeStr),
					exclude: splitGlobs(excludeStr)
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Pack failed');
			packResult = data.summary;
			currentProject = data.project;
			projectFiles = [];
			await loadProjectFiles(data.project);
			await loadHistory();
		} catch (e) {
			error = String(e);
		} finally {
			loadingPack = false;
		}
	}

	async function loadProjectFiles(project: string) {
		loadingOutputs = true;
		try {
			const res = await fetch(`/api/pack?action=outputs&project=${encodeURIComponent(project)}`);
			const data = await res.json();
			projectFiles = data.files || [];
		} catch (e) {
			error = String(e);
		} finally {
			loadingOutputs = false;
		}
	}

	async function openFile(file: string) {
		if (!currentProject) return;
		loadingContent = true;
		try {
			const res = await fetch(
				`/api/pack?action=content&project=${encodeURIComponent(currentProject)}&file=${encodeURIComponent(file)}`
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Read failed');
			selectedFile = file;
			selectedContent = data.content;
		} catch (e) {
			error = String(e);
		} finally {
			loadingContent = false;
		}
	}

	function downloadUrl(project: string, file: string): string {
		return `/api/pack?action=download&project=${encodeURIComponent(project)}&file=${encodeURIComponent(file)}`;
	}

	async function loadHistory() {
		loadingHistory = true;
		try {
			const res = await fetch('/api/pack?action=outputs');
			const data = await res.json();
			history = data.projects || [];
			keepMax = data.keepMax ?? 30;
		} catch {
			// ignore
		} finally {
			loadingHistory = false;
		}
	}

	async function deleteProject(project: string) {
		if (!window.confirm(`Delete pack output ${project}?`)) return;
		try {
			await fetch('/api/pack', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', project })
			});
			if (historyProject === project) {
				historyProject = '';
				historyFiles = [];
			}
			await loadHistory();
		} catch (e) {
			error = String(e);
		}
	}

	async function runCleanup() {
		const keep = window.prompt(`Keep most recent N packs (current: ${keepMax}):`, String(keepMax));
		if (keep === null) return;
		cleanupMessage = '';
		try {
			const res = await fetch('/api/pack', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'cleanup', keep: parseInt(keep, 10) || 0 })
			});
			const data = await res.json();
			cleanupMessage = data.removed > 0 ? `Removed ${data.removed} old pack(s)` : 'Nothing to remove';
			await loadHistory();
		} catch (e) {
			error = String(e);
		}
	}

	async function openHistoryProject(project: string) {
		historyProject = project;
		try {
			const res = await fetch(`/api/pack?action=outputs&project=${encodeURIComponent(project)}`);
			const data = await res.json();
			historyFiles = data.files || [];
		} catch (e) {
			error = String(e);
		}
	}

	function parseReview() {
		const lines = reviewText.split('\n');
		const out: Finding[] = [];
		const re = /\[(BUG|SUGGESTION|WARN)\]\s+filepath:(.+?)\s*\|\s*line:(\d+)\s*\|\s*msg:(.+)/;
		for (const raw of lines) {
			const line = raw.trim();
			const m = re.exec(line);
			if (m) {
				out.push({ level: m[1] as Finding['level'], filepath: m[2].trim(), line: parseInt(m[3], 10), msg: m[4].trim() });
			}
		}
		findings = out;
		applyStats = null;
		applyMessage = out.length > 0 ? `Parsed ${out.length} findings` : 'No findings matched';
	}

	async function runApply(dryRun: boolean) {
		if (findings.length === 0) return;
		try {
			const res = await fetch('/api/pack', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'apply', root: path, findings, dryRun })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Apply failed');
			applyStats = data.stats;
			applyMessage = dryRun ? 'Dry-run preview complete' : 'Applied findings';
		} catch (e) {
			error = String(e);
		}
	}

	function formatBytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	}

	const inputClass =
		'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

	onMount(() => {
		fetchRoots();
		loadHistory();
	});
</script>

<div class="p-6 max-w-7xl mx-auto space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-accent-blue">Pack to LLM Context</h1>
		<p class="text-muted-foreground mt-1">
			Package any allowed codebase into LLM-ready context (Markdown / JSONL / XML) with token-aware segments.
		</p>
	</div>

	{#if error}
		<div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
			{error}
			<button class="ml-2 underline" onclick={() => (error = '')}>dismiss</button>
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Project & Parameters</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div>
				<label for="pack-path" class="text-xs text-muted-foreground mb-1 block">Project directory</label>
				<div class="flex gap-2">
					<input id="pack-path" class={inputClass} bind:value={path} placeholder={loadingRoots ? 'Loading...' : repoRoot} spellcheck="false" />
					<Button variant="outline" onclick={runStats} disabled={loadingStats}>📊 Stats</Button>
					<Button variant="outline" onclick={runTree} disabled={loadingTree}>🌳 Tree</Button>
					<Button onclick={runPack} disabled={loadingPack}>{loadingPack ? '⏳ Packing...' : '📦 Pack'}</Button>
				</div>
				{#if allowedDirs.length > 1}
					<div class="flex flex-wrap gap-2 mt-2">
						{#each allowedDirs as dir}
							<button
								class="px-2 py-0.5 rounded bg-muted text-xs font-mono text-accent-blue hover:bg-primary/20 transition-colors {path === dir ? 'ring-1 ring-accent-blue' : ''}"
								onclick={() => (path = dir)}
							>
								{dir}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-4 gap-4">
				<div>
					<label for="pack-profile" class="text-xs text-muted-foreground mb-1 block">Profile</label>
					<select id="pack-profile" class={inputClass} bind:value={profile} onchange={onProfileChange}>
						<option value="review">review</option>
						<option value="rag">rag</option>
						<option value="finetune">finetune</option>
						<option value="context">context</option>
					</select>
				</div>
				<div>
					<label for="pack-format" class="text-xs text-muted-foreground mb-1 block">Format</label>
					<select id="pack-format" class={inputClass} bind:value={format}>
						<option value="markdown">markdown</option>
						<option value="single">single</option>
						<option value="jsonl">jsonl</option>
						<option value="xml">xml</option>
					</select>
				</div>
				<div>
					<label for="pack-model" class="text-xs text-muted-foreground mb-1 block">Model</label>
					<input id="pack-model" class={inputClass} bind:value={model} placeholder="gpt-4o" spellcheck="false" />
				</div>
				<div>
					<label for="pack-max-tokens" class="text-xs text-muted-foreground mb-1 block">Max tokens / segment</label>
					<input id="pack-max-tokens" class={inputClass} bind:value={maxTokens} type="number" placeholder="100000" />
				</div>
				<div>
					<label for="pack-include" class="text-xs text-muted-foreground mb-1 block">Include globs (comma-separated)</label>
					<input id="pack-include" class={inputClass} bind:value={includeStr} placeholder="src/**, tests/**" spellcheck="false" />
				</div>
				<div>
					<label for="pack-exclude" class="text-xs text-muted-foreground mb-1 block">Exclude globs (comma-separated)</label>
					<input id="pack-exclude" class={inputClass} bind:value={excludeStr} placeholder="**/*.generated.*" spellcheck="false" />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid grid-cols-2 gap-6">
		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm">Stats</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if loadingStats}
						<div class="space-y-2">
							<Skeleton class="h-5 w-40" />
							<Skeleton class="h-5 w-40" />
							<Skeleton class="h-5 w-40" />
						</div>
					{:else if statsResult}
						<div class="grid grid-cols-3 gap-3 mb-4">
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Files</p>
								<p class="text-xl font-bold">{statsResult.files}</p>
							</div>
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Tokens</p>
								<p class="text-xl font-bold text-accent-blue">{statsResult.totalTokens.toLocaleString()}</p>
							</div>
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Est. segments</p>
								<p class="text-xl font-bold">{statsResult.estimatedSegments}</p>
							</div>
						</div>
						<p class="text-xs text-muted-foreground mb-2">
							Model <code class="text-accent-yellow">{statsResult.model}</code> · cap{' '}
							<code class="text-accent-yellow">{statsResult.maxTokens.toLocaleString()}</code>
							{#if statsResult.skippedLarge && statsResult.skippedLarge.length > 0}
								· <span class="text-accent-yellow">{statsResult.skippedLarge.length} skipped (>5 MB)</span>
							{/if}
						</p>
						{#if statsResult.largest.length > 0}
							<p class="text-xs text-muted-foreground mb-1">Largest files:</p>
							<div class="space-y-1">
								{#each statsResult.largest as f}
									<div class="flex justify-between text-xs font-mono">
										<span class="truncate pr-2">{f.path}</span>
										<span class="text-accent-purple shrink-0">{f.tokens.toLocaleString()} tok</span>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<p class="text-sm text-muted-foreground">Run Stats to preview the project.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm">Project Tree {treeResult ? `(${treeResult.files} files)` : ''}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if loadingTree}
						<Skeleton class="h-64 w-full" />
					{:else if treeResult}
						<pre class="text-xs font-mono overflow-auto max-h-96 text-muted-foreground">{treeResult.tree}</pre>
					{:else}
						<p class="text-sm text-muted-foreground">Run Tree to preview discovered files.</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm">Pack Output {currentProject ? `· ${currentProject}` : ''}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if loadingPack}
						<div class="space-y-2">
							<Skeleton class="h-5 w-32" />
							<Skeleton class="h-20 w-full" />
							<Skeleton class="h-20 w-full" />
						</div>
					{:else if packResult}
						<div class="grid grid-cols-4 gap-3 mb-4">
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Files</p>
								<p class="text-lg font-bold">{packResult.files}</p>
							</div>
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Tokens</p>
								<p class="text-lg font-bold text-accent-blue">{packResult.totalTokens.toLocaleString()}</p>
							</div>
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Segments</p>
								<p class="text-lg font-bold">{packResult.segments}</p>
							</div>
							<div class="p-3 rounded-lg bg-muted/30">
								<p class="text-xs text-muted-foreground">Format</p>
								<p class="text-lg font-bold text-accent-green">{packResult.format}</p>
							</div>
						</div>
						{#if packResult.skippedLarge && packResult.skippedLarge.length > 0}
							<div class="mb-3 p-2 rounded bg-accent-yellow/10 border border-accent-yellow/30 text-xs text-accent-yellow">
								Skipped {packResult.skippedLarge.length} file(s) over size limit (5 MB):
								<span class="font-mono">{packResult.skippedLarge.join(', ')}</span>
							</div>
						{/if}
					{:else}
						<p class="text-sm text-muted-foreground mb-3">No output yet. Run Pack to generate segments.</p>
					{/if}

					{#if loadingOutputs}
						<div class="space-y-2">
							<Skeleton class="h-10 w-full" />
							<Skeleton class="h-10 w-full" />
						</div>
					{:else if projectFiles.length > 0}
						<div class="space-y-1">
							{#each projectFiles as f}
								<div class="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
									<button
										class="flex-1 text-left font-mono text-xs text-accent-blue hover:underline truncate"
										onclick={() => openFile(f.name)}
									>
										📄 {f.name}
									</button>
									<span class="text-xs text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
									<a
										class="text-xs px-2 py-1 rounded bg-muted hover:bg-primary/20 transition-colors shrink-0"
										href={downloadUrl(currentProject, f.name)}
										download
									>
										⬇
									</a>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if selectedFile}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm font-mono">{selectedFile}</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if loadingContent}
							<Skeleton class="h-64 w-full" />
						{:else if selectedFile.endsWith('.md')}
							<MarkdownView content={selectedContent} />
						{:else}
							<CodeViewer
								content={selectedContent}
								language={selectedFile.endsWith('.json') || selectedFile.endsWith('.jsonl') ? 'json' : selectedFile.endsWith('.xml') ? 'xml' : 'text'}
							/>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm">History</Card.Title>
					<Card.Action>
						<div class="flex items-center gap-2">
							{#if cleanupMessage}
								<span class="text-xs text-muted-foreground">{cleanupMessage}</span>
							{/if}
							<Button variant="outline" size="sm" onclick={runCleanup}>🧹 Cleanup</Button>
						</div>
					</Card.Action>
				</Card.Header>
				<Card.Content>
					{#if loadingHistory}
						<Skeleton class="h-10 w-full" />
					{:else if history.length > 0}
						<div class="space-y-1">
							{#each history as p}
								<button
									class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left {historyProject === p.name ? 'bg-muted' : ''}"
									onclick={() => openHistoryProject(p.name)}
								>
									<span class="text-xs font-mono text-accent-blue truncate">{p.name}</span>
									<span class="text-xs text-muted-foreground shrink-0">{p.mtime.slice(0, 19).replace('T', ' ')}</span>
								</button>
								{#if p.manifest}
									<div class="flex items-center gap-2 px-2 pb-1 -mt-1 text-[11px] text-muted-foreground">
										<span class="text-accent-green">{p.manifest.format}</span>
										<span class="font-mono">{p.manifest.model}</span>
										<span>{p.manifest.files} files</span>
										<span>{p.manifest.total_tokens.toLocaleString()} tok</span>
										<span>{p.manifest.segments} seg</span>
									</div>
								{/if}
							{/each}
						</div>
						{#if historyFiles.length > 0}
							<div class="mt-3 border-t border-border pt-3 space-y-1">
								{#each historyFiles as f}
									<div class="flex items-center gap-2">
										<span class="flex-1 font-mono text-xs text-muted-foreground truncate">📄 {f.name}</span>
										<a
											class="text-xs px-2 py-1 rounded bg-muted hover:bg-primary/20 transition-colors"
											href={downloadUrl(historyProject, f.name)}
											download
										>
											⬇
										</a>
									</div>
								{/each}
								<div class="pt-2">
									<Button
										variant="destructive"
										size="sm"
										onclick={() => deleteProject(historyProject)}
									>
										🗑 Delete {historyProject}
									</Button>
								</div>
							</div>
						{/if}
					{:else}
						<p class="text-sm text-muted-foreground">No previous packs.</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Review → Apply</Card.Title>
			<Card.Description>
				Paste an LLM review that contains a ```review-patch block, parse it, then insert TODO comments into the
				source at the cited lines.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			<textarea
				class="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				bind:value={reviewText}
				placeholder="```review-patch
[BUG] filepath:panel/src/routes/+page.svelte | line:12 | msg:Unhandled exception
```"
				spellcheck="false"
			></textarea>
			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={parseReview}>🔍 Parse</Button>
				<Button
					variant="outline"
					onclick={() => runApply(true)}
					disabled={findings.length === 0}
				>
					👁 Dry-run
				</Button>
				<Button onclick={() => runApply(false)} disabled={findings.length === 0}>✍ Apply</Button>
				{#if applyMessage}
					<span class="text-sm text-muted-foreground">{applyMessage}</span>
				{/if}
			</div>

			{#if findings.length > 0}
				<div class="space-y-1">
					{#each findings as f}
						<div class="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
							<span class="text-xs px-1.5 py-0.5 rounded font-medium {f.level === 'BUG'
								? 'bg-red-500/20 text-red-500'
								: f.level === 'WARN'
									? 'bg-accent-yellow/20 text-accent-yellow'
									: 'bg-accent-blue/20 text-accent-blue'}">
								{f.level}
							</span>
							<span class="font-mono text-xs text-accent-purple shrink-0">{f.filepath}:{f.line}</span>
							<span class="text-xs text-muted-foreground truncate">{f.msg}</span>
						</div>
					{/each}
				</div>
			{/if}

			{#if applyStats}
				<p class="text-sm">
					<span class="text-accent-green">Applied: {applyStats.applied}</span>
					<span class="text-muted-foreground ml-3">Skipped: {applyStats.skipped}</span>
					{#if applyStats.filesModified.length > 0}
						<span class="text-xs text-muted-foreground ml-3 font-mono">files: {applyStats.filesModified.join(', ')}</span>
					{/if}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
