<script lang="ts">
	import Glyph from '$lib/components/Glyph.svelte';

	// Petite icône à côté du nom d'un perso : sa page dans l'Armurerie de Blizzard, dans un nouvel onglet.
	let { href, name }: { href: string | null; name: string } = $props();
</script>

{#if href}
	<a class="armory-link" {href} target="_blank" rel="noopener" title="Voir {name} dans l'Armurerie de Blizzard" aria-label="Voir {name} dans l'Armurerie de Blizzard">
		<Glyph name="external" size={14} />
	</a>
{/if}

<style>
	.armory-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-left: 0.125rem;
		border-radius: 6px;
		color: var(--muted);
		vertical-align: middle;
		text-decoration: none;
	}
	.armory-link:hover {
		background: var(--tint);
		color: var(--accent-ink);
	}
	.armory-link:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 1px;
	}
</style>
