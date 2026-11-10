<script lang="ts">
	import { groupRecipes } from '$lib/recipes';
	import type { Recipe } from '$lib/server/db/schema';
	import RecipeLink from './RecipeLink.svelte';

	// Recettes d'un métier rangées comme dans la fenêtre du jeu (« Bandages », « Remèdes »…),
	// avec un petit filtre dès que la liste devient longue. Avec orderFrom (un autre joueur, pour
	// un membre connecté), chaque recette ouvre la commande adressée à cet artisan.
	let { recipes, orderFrom = null }: { recipes: Recipe[]; orderFrom?: { id: string; name: string } | null } = $props();
	const orderHref = (id: number) => (orderFrom ? `/commandes/nouvelle?recette=${id}&artisan=${orderFrom.id}` : null);

	const FILTER_FROM = 20;
	const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/g, 'oe').toLocaleLowerCase('fr');
	let filter = $state('');
	const groups = $derived.by(() => {
		const q = fold(filter.trim());
		return groupRecipes(q ? recipes.filter((r) => fold(r.name).includes(q)) : recipes);
	});
</script>

<div class="recipe-list">
	{#if orderFrom}<p class="muted hint">Clique sur une recette pour la commander à {orderFrom.name}.</p>{/if}
	{#if recipes.length >= FILTER_FROM}
		<input type="search" class="filter" bind:value={filter} placeholder="Filtrer ces recettes…" aria-label="Filtrer ces recettes" />
	{/if}
	{#each groups as g (g.category)}
		<section>
			{#if g.category}<h4>{g.category} <span class="muted">{g.recipes.length}</span></h4>{/if}
			<ul>
				{#each g.recipes as r (r.id)}
					<li><RecipeLink recipe={r} orderHref={orderHref(r.id)} /></li>
				{/each}
			</ul>
		</section>
	{:else}
		<p class="muted">Aucune recette ne contient « {filter.trim()} ».</p>
	{/each}
</div>

<style>
	.recipe-list {
		display: grid;
		gap: 0.75rem;
		margin: 0.5rem 0 0.25rem;
		font-size: 0.875rem;
	}
	.filter {
		max-width: 16rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.875rem;
	}
	h4 {
		margin: 0 0 0.25rem;
		padding-bottom: 0.125rem;
		border-bottom: 1px solid var(--border);
		color: var(--gold);
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	h4 .muted {
		font-weight: 400;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	p {
		margin: 0;
	}
	li :global(a.name) {
		color: var(--text);
	}
	li :global(a.name:hover) {
		color: var(--accent-ink);
	}
</style>
