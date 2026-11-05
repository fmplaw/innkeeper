<script lang="ts">
	import ClassEmblem from '$lib/components/ClassEmblem.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import { classColor } from '$lib/labels';
	import type { Role } from '$lib/roles';
	import { recipeUrl } from '$lib/wowhead';

	let { data } = $props();
	const cfg = $derived(data.config);
	const professionName = (id: string) => cfg.professions.find((p) => p.id === id)?.name ?? id;

	// Recherche sans accents ni majuscules : « oeufs » trouve « Œufs aux herbes ».
	const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/g, 'oe').toLocaleLowerCase('fr');
	let query = $state('');
	const results = $derived.by(() => {
		const q = fold(query.trim());
		if (q.length < 2) return null;
		const found = new Map<number, { id: number; name: string; profession: string; artisans: (typeof data.professions)[number]['artisans'] }>();
		for (const p of data.professions)
			for (const a of p.artisans)
				for (const r of a.recipes) {
					if (!fold(r.name).includes(q)) continue;
					const entry = found.get(r.id) ?? { id: r.id, name: r.name, profession: p.id, artisans: [] };
					entry.artisans.push(a);
					found.set(r.id, entry);
				}
		return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	});
	const withRecipes = $derived(data.professions.some((p) => p.artisans.some((a) => a.recipes.length)));
</script>

<svelte:head><title>Artisans · {cfg.guild.name}</title></svelte:head>

<div class="page-head">
	<div>
		<h1>Artisans</h1>
		<p class="sub">Qui sait fabriquer quoi dans la guilde.</p>
	</div>
</div>

{#snippet who(a: (typeof data.professions)[number]['artisans'][number], showRecipes: boolean)}
	<li class="artisan">
		<ClassEmblem {cfg} classId={a.class} role={a.role as Role} size={30} />
		<span class="ident">
			<a class="name class-ink" style:--c={classColor(cfg, a.class)} href="/joueurs/{a.playerId}">{a.name}</a>
			<span class="muted small">{a.player}{a.isMain ? '' : ' · reroll'}</span>
		</span>
		<span class="skill num" title="Niveau du métier">{a.skill ?? '—'}</span>
		{#if showRecipes && a.recipes.length}
			<details class="recipes">
				<summary>{a.recipes.length} recette{a.recipes.length > 1 ? 's' : ''}</summary>
				<ul>
					{#each a.recipes.toSorted((x, y) => x.name.localeCompare(y.name, 'fr')) as r (r.id)}
						<li><a href={recipeUrl(r.id)} target="_blank" rel="noopener">{r.name}</a></li>
					{/each}
				</ul>
			</details>
		{/if}
	</li>
{/snippet}

{#if data.professions.length === 0}
	<p class="empty">Aucun métier renseigné pour l'instant : chacun indique les siens dans « Mes persos ».</p>
{:else}
	<div class="search">
		<Glyph name="search" size={18} />
		<input id="recette" type="search" bind:value={query} placeholder="Chercher une recette : bandage, potion, rôti…" aria-label="Chercher une recette" />
	</div>
	{#if !withRecipes}
		<p class="muted small hint">
			Aucune recette exportée pour l'instant. Chaque artisan exporte les siennes avec l'addon Innkeeper Sync, en ouvrant ses
			fenêtres de métier en jeu.
		</p>
	{/if}

	{#if results}
		<section class="group">
			<h2>{results.length} recette{results.length > 1 ? 's' : ''} pour « {query.trim()} »</h2>
			{#each results as r (r.id)}
				<article class="result">
					<h3>
						<a href={recipeUrl(r.id)} target="_blank" rel="noopener">{r.name}</a>
						<span class="muted small">{professionName(r.profession)}</span>
					</h3>
					<ul class="artisans">
						{#each r.artisans as a (a.characterId)}{@render who(a, false)}{/each}
					</ul>
				</article>
			{:else}
				<p class="empty">Personne ne connaît de recette qui contient « {query.trim()} », ou elle n'a pas encore été exportée.</p>
			{/each}
		</section>
	{:else}
		<nav class="chips" aria-label="Métiers">
			{#each data.professions as p (p.id)}<a class="chip" href="#{p.id}">{professionName(p.id)} <span class="num">{p.artisans.length}</span></a>{/each}
		</nav>
		{#each data.professions as p (p.id)}
			<section class="group" id={p.id}>
				<h2>{professionName(p.id)} <span class="muted">({p.artisans.length})</span></h2>
				<ul class="artisans">
					{#each p.artisans as a (a.characterId)}{@render who(a, true)}{/each}
				</ul>
			</section>
		{/each}
	{/if}
{/if}

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		max-width: 32rem;
		padding: 0 0.875rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
	}
	.search input:focus {
		outline: none;
	}
	.search:focus-within {
		border-color: var(--accent);
	}
	.hint {
		margin: 0.75rem 0 0;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}
	.chip {
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text);
		font-size: 0.875rem;
		text-decoration: none;
	}
	.chip:hover {
		border-color: var(--accent);
	}
	.chip .num {
		color: var(--muted);
	}
	.group {
		margin-top: 2.5rem;
		scroll-margin-top: 5rem;
	}
	.group h2 {
		margin: 0 0 0.75rem;
	}
	.result + .result {
		margin-top: 1.25rem;
	}
	.result h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
		font-size: 1.0625rem;
	}
	.artisans {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.artisan {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.25rem 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}
	.ident {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.625rem;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		text-decoration: none;
	}
	.skill {
		min-width: 2.5rem;
		text-align: right;
		font-weight: 600;
	}
	.recipes {
		grid-column: 2 / -1;
		font-size: 0.875rem;
	}
	.recipes summary {
		cursor: pointer;
		color: var(--muted);
	}
	.recipes ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.25rem 1rem;
		margin: 0.375rem 0 0.25rem;
		padding: 0;
		list-style: none;
	}
	.recipes a,
	.result h3 a {
		color: var(--text);
	}
	.recipes a:hover,
	.result h3 a:hover {
		color: var(--accent-ink);
	}
</style>
