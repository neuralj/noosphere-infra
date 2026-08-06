<script>
	import { page } from '$app/stores';

	const links = [
		{ href: '/', label: 'Dashboard', icon: '⊞' },
		{ href: '/browse', label: 'Files', icon: '📁' },
		{ href: '/pack', label: 'Pack', icon: '🧩' },
		{ href: '/images', label: 'Images', icon: '🐳' },
		{ href: '/services', label: 'Services', icon: '⚡' },
		{ href: '/ci', label: 'CI/CD', icon: '⚙' },
		{ href: '/alignment', label: 'Alignment', icon: '📜' }
	];
</script>

<aside class="w-56 bg-card border-r border-border flex flex-col shrink-0">
	<div class="p-4 border-b border-border">
		<h1 class="text-lg font-bold text-accent-blue">OpenLaputa</h1>
		<p class="text-xs text-muted-foreground mt-1">Infrastructure Viewer</p>
	</div>
	<nav class="flex-1 p-2 space-y-1">
		{#each links as link}
			{@const active = $page.url.pathname === link.href || (link.href !== '/' && $page.url.pathname.startsWith(link.href))}
			<a
				href={link.href}
				class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors {active
					? 'bg-primary/20 text-accent-blue'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
			>
				<span class="text-base">{link.icon}</span>
				<span>{link.label}</span>
			</a>
		{/each}
	</nav>
	<div class="p-3 border-t border-border">
		<p class="text-xs text-muted-foreground text-center">openlaputa</p>
	</div>
</aside>
