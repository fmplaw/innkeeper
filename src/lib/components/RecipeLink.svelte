<script lang="ts">
	import { onMount } from 'svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import { recipeTooltip, recipeUrl } from '$lib/wowhead';

	// Nom d'une recette. Pour un membre connecté, le nom ouvre la commande (le geste naturel) et
	// Wowhead passe sur la petite icône d'à côté ; la bulle du jeu reste au survol du nom grâce à
	// data-wowhead. Sans commande possible (visiteur), le nom mène à Wowhead comme avant.
	// Bulle sur le nom seulement avec une souris : sur un écran tactile, Wowhead intercepte le
	// premier appui (fenêtre plein écran, bouton « Tap Link ») et la commande ne s'ouvrirait pas.
	// Là, c'est l'icône qui montre la fiche.
	let { recipe, orderHref = null }: { recipe: { id: number; name: string }; orderHref?: string | null } = $props();
	let hover = $state(false);
	onMount(() => (hover = matchMedia('(hover: hover)').matches));
</script>

{#if orderHref}
	<a class="name" href={orderHref} data-wowhead={hover ? recipeTooltip(recipe.id) : undefined}>{recipe.name}</a><a
		class="wowhead"
		href={recipeUrl(recipe.id)}
		target="_blank"
		rel="noopener"
		data-wh-icon-added="true"
		title="Voir {recipe.name} sur Wowhead"
		aria-label="Voir {recipe.name} sur Wowhead"><Glyph name="external" size={13} /></a
	>
{:else}
	<a class="name" href={recipeUrl(recipe.id)} target="_blank" rel="noopener">{recipe.name}</a>
{/if}

<style>
	.wowhead {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.375rem;
		height: 1.375rem;
		margin-left: 0.125rem;
		border-radius: 6px;
		color: var(--muted);
		vertical-align: middle;
		text-decoration: none;
	}
	.wowhead:hover {
		background: var(--tint);
		color: var(--accent-ink);
	}
	.wowhead:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 1px;
	}
</style>
