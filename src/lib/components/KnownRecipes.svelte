<script lang="ts">
	import { onMount } from 'svelte';
	import { professionNames } from '$lib/labels';
	import { recipesAnchor } from '$lib/recipes';
	import type { PublicConfig } from '$lib/server/config';
	import type { KnownRecipes } from '$lib/server/db/schema';
	import RecipeList from './RecipeList.svelte';

	// Recettes exportées par l'addon, repliées par métier. Chaque recette renvoie vers Wowhead,
	// avec la bulle du jeu au survol quand la guilde l'a activée (Admin → Guilde). Un lien de la
	// page Artisans (#recettes-<perso>-<métier>) ouvre directement le bon métier.
	let { cfg, known, characterId }: { cfg: PublicConfig; known: KnownRecipes[] | null; characterId: number } = $props();

	let hash = $state('');
	onMount(() => {
		const read = () => (hash = decodeURIComponent(location.hash.slice(1)));
		read();
		window.addEventListener('hashchange', read);
		return () => window.removeEventListener('hashchange', read);
	});
</script>

{#each known ?? [] as k (k.profession)}
	{@const anchor = recipesAnchor(characterId, k.profession)}
	<details class="known" id={anchor} open={hash === anchor}>
		<summary>
			{professionNames(cfg, [{ id: k.profession, level: k.skill }]) || k.profession} · {k.recipes.length} recette{k.recipes.length > 1 ? 's' : ''} connue{k.recipes.length > 1 ? 's' : ''}
		</summary>
		<RecipeList recipes={k.recipes} />
	</details>
{/each}

<style>
	.known {
		scroll-margin-top: 6rem;
	}
	.known summary {
		cursor: pointer;
		font-size: 0.875rem;
	}
	.known:target summary {
		color: var(--accent-ink);
	}
</style>
