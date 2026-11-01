<script lang="ts">
	import GameBadge from '$lib/components/GameBadge.svelte';
	import HomonymWarning from '$lib/components/HomonymWarning.svelte';
	import { enhance } from '$app/forms';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { className, classColor, fullName, professionNames, raceName, specRole } from '$lib/labels';

	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const main = $derived(data.characters.find((c) => c.isMain));
	const rerolls = $derived(data.characters.filter((c) => !c.isMain));
</script>

<div class="row head">
	<h1>Mes persos</h1>
	<div class="row">
		<a class="button secondary" href="/persos/synchro">Synchronisation automatique</a>
		<a class="button" href="/persos/nouveau">Ajouter un perso</a>
	</div>
</div>

{#if form?.message}<p class="card error">{form.message}</p>{/if}

{#snippet card(c: (typeof data.characters)[number])}
	<article class="card" class:main={c.isMain}>
		<div class="row">
			<h2 style:color={classColor(cfg, c.class)}>{fullName(c)}</h2>
			{#if c.isMain}<span class="badge main">Main</span>{:else}<span class="badge">Reroll</span>{/if}
			<GameBadge character={c} importAt={data.gameImportAt} showPending />
		</div>
		<HomonymWarning homonyms={data.homonyms[c.id]} viewerId={data.user?.id} />
		<p>
			Niv. {c.level}
			{raceName(cfg, c.race)}
			{className(cfg, c.class)}
			· {specRole(cfg, c.class, c.spec, c.role)}
		</p>
		{#if c.spec2 || c.role2}
			<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2, c.role2)}</p>
		{/if}
		{#if c.pve || c.pvp}
			<p class="interests">
				<InterestBadges pve={c.pve} pvp={c.pvp} />
				{#if c.interestsUpdatedAt}<span class="muted small">à jour du {dateFormat.format(c.interestsUpdatedAt)}</span>{/if}
			</p>
		{/if}
		{#if c.professions.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}
		{#if c.recipes}<p class="muted small">Recettes : {c.recipes}</p>{/if}
		{#if c.notes}<p class="muted notes">{c.notes}</p>{/if}
		<div class="row">
			<a class="button secondary" href="/persos/{c.id}">Modifier</a>
			{#if !c.isMain}
				<form method="POST" action="?/setMain" use:enhance>
					<input type="hidden" name="id" value={c.id} />
					<button class="secondary">Définir comme main</button>
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
				<button class="danger">Supprimer</button>
			</form>
		</div>
	</article>
{/snippet}

{#if !main}
	<p class="card muted">Tu n'as encore aucun perso. Commence par ton main !</p>
{:else}
	{@render card(main)}

	<h2 class="section">Rerolls de {main.name} <span class="muted">({rerolls.length})</span></h2>
	{#if rerolls.length}
		<div class="list">
			{#each rerolls as c (c.id)}{@render card(c)}{/each}
		</div>
	{:else}
		<p class="muted">Aucun reroll pour l'instant.</p>
	{/if}
{/if}

<style>
	.head {
		justify-content: space-between;
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: 1rem;
	}
	.card.main {
		border-color: var(--gold);
	}
	h2 {
		margin: 0;
		font-size: 1.2rem;
	}
	h2.section {
		margin: 2rem 0 1rem;
		font-size: 1.05rem;
	}
	.interests {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.6rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.notes {
		white-space: pre-line;
	}
</style>
