<script lang="ts">
	import { recipeUrl } from '$lib/wowhead';

	// Liste de recettes (Artisans, fiches) : hauteur limitée pour qu'un artisan à 150 recettes ne
	// repousse pas toute la page, et petit filtre dès que la liste devient longue.
	let { recipes }: { recipes: { id: number; name: string }[] } = $props();

	const FILTER_FROM = 20;
	const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/g, 'oe').toLocaleLowerCase('fr');
	let filter = $state('');
	const sorted = $derived(recipes.toSorted((a, b) => a.name.localeCompare(b.name, 'fr')));
	const shown = $derived.by(() => {
		const q = fold(filter.trim());
		return q ? sorted.filter((r) => fold(r.name).includes(q)) : sorted;
	});
</script>

<div class="recipe-list">
	{#if recipes.length >= FILTER_FROM}
		<input type="search" class="filter" bind:value={filter} placeholder="Filtrer ces recettes…" aria-label="Filtrer ces recettes" />
	{/if}
	<ul class:long={recipes.length > 12}>
		{#each shown as r (r.id)}
			<li><a href={recipeUrl(r.id)} target="_blank" rel="noopener">{r.name}</a></li>
		{:else}
			<li class="muted">Aucune recette ne contient « {filter.trim()} ».</li>
		{/each}
	</ul>
</div>

<style>
	.recipe-list {
		display: grid;
		gap: 0.5rem;
		margin: 0.5rem 0 0.25rem;
		font-size: 0.875rem;
	}
	.filter {
		max-width: 16rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.875rem;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* Au-delà d'une douzaine : la liste défile dans son cadre. */
	ul.long {
		max-height: 14rem;
		overflow-y: auto;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		overscroll-behavior: contain;
	}
	a {
		color: var(--text);
	}
	a:hover {
		color: var(--accent-ink);
	}
</style>
