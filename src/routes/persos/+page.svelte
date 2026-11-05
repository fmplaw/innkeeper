<script lang="ts">
	import CharacterTitle from '$lib/components/CharacterTitle.svelte';
	import GameBadge from '$lib/components/GameBadge.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import HomonymWarning from '$lib/components/HomonymWarning.svelte';
	import { enhance } from '$app/forms';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import KnownRecipes from '$lib/components/KnownRecipes.svelte';
	import { professionNames, specRole } from '$lib/labels';

	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const main = $derived(data.characters.find((c) => c.isMain));
	const rerolls = $derived(data.characters.filter((c) => !c.isMain));
</script>

<div class="page-head">
	<div>
		<h1>Mes persos</h1>
		<p class="sub">Une fiche à jour aide les officiers à composer les sorties.</p>
	</div>
	<div class="row">
		<a class="button secondary" href="/persos/synchro"><Glyph name="refresh" size={17} /> Synchronisation automatique</a>
		<a class="button" href="/persos/nouveau"><Glyph name="plus" size={18} /> Ajouter un perso</a>
	</div>
</div>

{#if form?.message}<p class="notice bad"><Glyph name="warning" /> {form.message}</p>{/if}

{#snippet card(c: (typeof data.characters)[number])}
	<article class="card" class:main={c.isMain}>
		<CharacterTitle {cfg} character={c} big={c.isMain}>
			{#if c.isMain}<span class="badge main">Main</span>{:else}<span class="badge plain">Reroll</span>{/if}
			<GameBadge character={c} importAt={data.gameImportAt} showPending />
		</CharacterTitle>
		<HomonymWarning homonyms={data.homonyms[c.id]} viewerId={data.user?.id} />
		<dl class="facts">
			{#if c.spec2 || c.role2}
				<div><dt>Spé secondaire</dt><dd>{specRole(cfg, c.class, c.spec2, c.role2)}</dd></div>
			{/if}
			{#if c.professions.length}
				<div><dt>Métiers</dt><dd>{professionNames(cfg, c.professions)}</dd></div>
			{/if}
			{#if c.pve || c.pvp}
				<div>
					<dt>Envies</dt>
					<dd>
						<InterestBadges pve={c.pve} pvp={c.pvp} />
						{#if c.interestsUpdatedAt}<span class="muted small">à jour du {dateFormat.format(c.interestsUpdatedAt)}</span>{/if}
					</dd>
				</div>
			{/if}
			{#if c.knownRecipes?.length}
				<div class="wide"><dt>Recettes connues en jeu</dt><dd class="recipes"><KnownRecipes {cfg} known={c.knownRecipes} /></dd></div>
			{/if}
			{#if c.recipes}<div><dt>Recettes notables</dt><dd>{c.recipes}</dd></div>{/if}
			{#if c.notes}<div><dt>Notes</dt><dd class="notes">{c.notes}</dd></div>{/if}
		</dl>
		<div class="actions">
			<a class="button secondary small" href="/persos/{c.id}"><Glyph name="pencil" size={15} /> Modifier</a>
			{#if !c.isMain}
				<form method="POST" action="?/setMain" use:enhance>
					<input type="hidden" name="id" value={c.id} />
					<button class="secondary small">Définir comme main</button>
				</form>
			{/if}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!window.confirm(`Supprimer ${c.name} ?`)) cancel();
				}}
			>
				<input type="hidden" name="id" value={c.id} />
				<button class="link danger-link">Supprimer</button>
			</form>
		</div>
	</article>
{/snippet}

{#if !main}
	<div class="empty-state">
		<p class="serif">Tu n'as encore aucun perso.</p>
		<p class="muted">Commence par ton main : c'est lui qui compte pour la composition des sorties.</p>
		<a class="button" href="/persos/nouveau"><Glyph name="plus" size={18} /> Ajouter mon main</a>
	</div>
{:else}
	{@render card(main)}

	<h2 class="section">Rerolls de {main.name} <span class="muted num">{rerolls.length}</span></h2>
	{#if rerolls.length}
		<div class="list">
			{#each rerolls as c (c.id)}{@render card(c)}{/each}
		</div>
	{:else}
		<p class="muted">Aucun reroll pour l'instant.</p>
	{/if}
{/if}

<style>
	article {
		display: grid;
		gap: 1rem;
		align-content: start;
	}
	.card.main {
		box-shadow: var(--shadow), inset 0 0 0 1px color-mix(in oklab, var(--gold) 35%, transparent);
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 0.75rem 2rem;
		margin: 0;
	}
	.list .facts {
		grid-template-columns: 1fr;
	}
	.facts dt {
		color: var(--muted);
		font-size: 0.8125rem;
		font-weight: 500;
	}
	.facts dd {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.5rem;
		margin: 0.125rem 0 0;
	}
	.notes {
		white-space: pre-line;
	}
	.facts .wide {
		grid-column: 1 / -1;
	}
	.facts dd.recipes {
		display: grid;
		gap: 0.25rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}
	.actions form:last-child {
		margin-left: auto;
	}
	.danger-link {
		color: var(--danger);
		font-size: 0.875rem;
	}
	.section {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 3rem 0 1rem;
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		gap: 1rem;
	}
	.empty-state {
		display: grid;
		justify-items: center;
		gap: 0.75rem;
		padding: 4rem 1rem;
		text-align: center;
	}
	.empty-state p {
		margin: 0;
	}
	.empty-state .serif {
		font-size: 1.75rem;
	}
</style>
