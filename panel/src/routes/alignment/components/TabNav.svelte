<script lang="ts">
	interface Tab {
		id: string;
		label: string;
		icon: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab: string;
		onTabChange: (tabId: string) => void;
	}

	let { tabs, activeTab, onTabChange }: Props = $props();
</script>

<div class="bg-surface-light border border-border rounded-xl p-1.5">
	<div class="flex gap-1">
		{#each tabs as tab}
			<button
				class="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium 
					transition-all duration-200 ease-out
					hover:scale-105 hover:shadow-lg
					{activeTab === tab.id
					? 'bg-surface-lighter text-text'
					: 'text-text-muted hover:text-text hover:bg-surface-lighter'}"
				onclick={() => onTabChange(tab.id)}
			>
				<span class="text-base transition-transform duration-200 hover:scale-110">{tab.icon}</span>
				<span>{tab.label}</span>
				{#if activeTab === tab.id}
					<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent-blue rounded-full"></span>
				{/if}
			</button>
		{/each}
	</div>
</div>
