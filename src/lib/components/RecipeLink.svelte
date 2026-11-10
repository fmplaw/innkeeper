<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Glyph from '$lib/components/Glyph.svelte';
	import { recipeIconUrl, recipeTooltip, recipeUrl } from '$lib/wowhead';

	// Nom d'une recette. Pour un membre connecté, le nom ouvre la commande (le geste naturel) et
	// Wowhead passe sur la petite icône d'à côté ; la bulle du jeu reste au survol du nom grâce à
	// data-wowhead. Sans commande possible (visiteur), le nom mène à Wowhead comme avant.
	// Bulle sur le nom seulement avec une souris : sur un écran tactile, Wowhead intercepte le
	// premier appui (fenêtre plein écran, bouton « Tap Link ») et la commande ne s'ouvrirait pas.
	// Là, c'est l'icône qui montre la fiche.
	// Icône du jeu devant le nom quand la guilde a activé les bulles Wowhead (l'image vient de
	// Wowhead, comme le script des bulles ; mentionné dans Confidentialité). data-wh-icon-added
	// empêche le script d'en ajouter une seconde au survol.
	let { recipe, orderHref = null }: { recipe: { id: number; name: string; icon?: string | null }; orderHref?: string | null } = $props();
	let hover = $state(false);
	onMount(() => (hover = matchMedia('(hover: hover)').matches));
	const icon = $derived(page.data.config?.wowheadTooltips && recipe.icon ? recipeIconUrl(recipe.icon) : null);
</script>

{#snippet label()}{#if icon}<img class="icon" src={icon} alt="" width="16" height="16" loading="lazy" />{/if}{recipe.name}{/snippet}

{#if orderHref}
	<a class="name" href={orderHref} data-wowhead={hover ? recipeTooltip(recipe.id) : undefined} data-wh-icon-added={icon ? 'true' : undefined}
		>{@render label()}</a
	><a
		class="wowhead"
		href={recipeUrl(recipe.id)}
		target="_blank"
		rel="noopener"
		data-wh-icon-added="true"
		title="Voir {recipe.name} sur Wowhead"
		aria-label="Voir {recipe.name} sur Wowhead"><Glyph name="external" size={13} /></a
	>
{:else}
	<a class="name" href={recipeUrl(recipe.id)} target="_blank" rel="noopener" data-wh-icon-added={icon ? 'true' : undefined}>{@render label()}</a>
{/if}

<style>
	.icon {
		width: 1rem;
		height: 1rem;
		margin-right: 0.375rem;
		border-radius: 3px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5);
		vertical-align: -0.1875rem;
	}
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
