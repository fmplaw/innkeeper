<script lang="ts">
	import { professionNames } from '$lib/labels';
	import type { PublicConfig } from '$lib/server/config';
	import type { KnownRecipes } from '$lib/server/db/schema';
	import { recipeUrl } from '$lib/wowhead';

	// Recettes exportées par l'addon, repliées par métier. Chaque recette renvoie vers Wowhead,
	// avec la bulle du jeu au survol quand la guilde l'a activée (Admin → Guilde).
	let { cfg, known }: { cfg: PublicConfig; known: KnownRecipes[] | null } = $props();
	const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr');
</script>

{#each known ?? [] as k (k.profession)}
	<details class="known">
		<summary>
			{professionNames(cfg, [{ id: k.profession, level: k.skill }]) || k.profession} · {k.recipes.length} recette{k.recipes.length > 1 ? 's' : ''} connue{k.recipes.length > 1 ? 's' : ''}
		</summary>
		<ul>
			{#each k.recipes.toSorted(byName) as r (r.id)}
				<li><a href={recipeUrl(r.id)} target="_blank" rel="noopener">{r.name}</a></li>
			{/each}
		</ul>
	</details>
{/each}

<style>
	.known summary {
		cursor: pointer;
		font-size: 0.875rem;
	}
	.known ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.25rem 1rem;
		margin: 0.5rem 0 0.25rem;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}
	.known a {
		color: var(--text);
	}
	.known a:hover {
		color: var(--accent-ink);
	}
</style>
