<script lang="ts">
	import KnownRecipes from '$lib/components/KnownRecipes.svelte';
	import { armoryHref } from '$lib/armory';
	import CharacterTitle from '$lib/components/CharacterTitle.svelte';
	import GameBadge from '$lib/components/GameBadge.svelte';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { professionNames, specRole } from '$lib/labels';

	let { data } = $props();
	const cfg = $derived(data.config);
	const p = $derived(data.player);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<header class="head">
	{#if p.avatar}<img src={p.avatar} alt="" />{:else}<span class="initial" aria-hidden="true">{p.displayName[0]?.toUpperCase()}</span>{/if}
	<div>
		<h1>{p.displayName}</h1>
		{#if p.roles.length}
			<div class="roles">{#each p.roles as role (role)}<span class="badge">{role}</span>{/each}</div>
		{/if}
		{#if p.officerInfo}
			<p class="muted small">
				Arrivé le {dateFormat.format(p.officerInfo.joinedAt)}{p.officerInfo.joinedKnown ? '' : ' (première connexion)'}
				· dernière connexion le {dateFormat.format(p.officerInfo.lastLogin)}
			</p>
		{/if}
	</div>
	{#if data.isMe}<a class="button secondary" href="/persos">Gérer mes persos</a>{/if}
</header>

{#if p.characters.length === 0}
	<p class="empty">Aucun perso renseigné pour l'instant.</p>
{:else}
	<div class="list">
		{#each p.characters as c (c.id)}
			<article class="card" class:main={c.isMain}>
				<CharacterTitle {cfg} character={c} armoryHref={armoryHref(cfg, c)}>
					<span class="badge" class:main={c.isMain} class:plain={!c.isMain}>{c.isMain ? 'Main' : 'Reroll'}</span>
					<GameBadge character={c} importAt={data.gameImportAt} />
				</CharacterTitle>
				{#if c.spec2 || c.role2}<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2, c.role2)}</p>{/if}
				{#if c.pve || c.pvp}<p><InterestBadges pve={c.pve} pvp={c.pvp} /></p>{/if}
				{#if c.professions.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}
				{#if c.recipes}<p class="muted small">Recettes : {c.recipes}</p>{/if}
				<KnownRecipes {cfg} known={c.knownRecipes} />
				{#if c.lastOnlineAt}<p class="muted small">Vu en jeu le {dateFormat.format(c.lastOnlineAt)}</p>{/if}
				{#if c.rosters.length}
					<p class="rosters">
						{#each c.rosters as r (r.id)}<a class="badge" href="/roster?equipe={r.id}">{r.name}</a>{/each}
					</p>
				{/if}
				{#if c.notes}<p class="muted small notes">Notes : {c.notes}</p>{/if}
				{#if data.officer && !data.isMe}<a class="small" href="/persos/{c.id}">Modifier</a>{/if}
			</article>
		{/each}
	</div>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 1.25rem;
		margin-bottom: 2.5rem;
	}
	.head img,
	.initial {
		width: 72px;
		height: 72px;
		border-radius: 50%;
	}
	.initial {
		display: grid;
		place-items: center;
		background: var(--tint);
		color: var(--accent-ink);
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 600;
	}
	.head > div {
		flex: 1;
		display: grid;
		gap: 0.5rem;
	}
	.head p {
		margin: 0;
	}
	.roles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.rosters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.rosters a {
		color: var(--text);
		text-decoration: none;
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		gap: 1rem;
	}
	article {
		display: grid;
		gap: 0.625rem;
		align-content: start;
	}
	article p {
		margin: 0;
	}
	article.main {
		box-shadow: var(--shadow), inset 0 0 0 1px color-mix(in oklab, var(--gold) 35%, transparent);
	}
	.small {
		margin: 0;
	}
	.notes {
		white-space: pre-line;
	}
</style>
