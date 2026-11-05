<script lang="ts">
	import { professionNames } from '$lib/labels';
	import type { PublicConfig } from '$lib/server/config';
	import type { KnownRecipes } from '$lib/server/db/schema';
	import RecipeList from './RecipeList.svelte';

	// Recettes exportées par l'addon, repliées par métier. Chaque recette renvoie vers Wowhead,
	// avec la bulle du jeu au survol quand la guilde l'a activée (Admin → Guilde).
	let { cfg, known }: { cfg: PublicConfig; known: KnownRecipes[] | null } = $props();
</script>

{#each known ?? [] as k (k.profession)}
	<details class="known">
		<summary>
			{professionNames(cfg, [{ id: k.profession, level: k.skill }]) || k.profession} · {k.recipes.length} recette{k.recipes.length > 1 ? 's' : ''} connue{k.recipes.length > 1 ? 's' : ''}
		</summary>
		<RecipeList recipes={k.recipes} />
	</details>
{/each}

<style>
	.known summary {
		cursor: pointer;
		font-size: 0.875rem;
	}
</style>
