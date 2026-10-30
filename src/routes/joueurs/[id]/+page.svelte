<script lang="ts">
	import GameBadge from '$lib/components/GameBadge.svelte';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { className, classColor, fullName, professionNames, raceName, specRole } from '$lib/labels';

	let { data } = $props();
	const cfg = $derived(data.config);
	const p = $derived(data.player);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<header class="card head">
	{#if p.avatar}<img src={p.avatar} alt="" />{/if}
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
	<p class="card muted">Aucun perso renseigné pour l'instant.</p>
{:else}
	<div class="list">
		{#each p.characters as c (c.id)}
			<article class="card" class:main={c.isMain}>
				<div class="row title">
					<h2 style:color={classColor(cfg, c.class)}>{fullName(c)}</h2>
					<span class="badge" class:main={c.isMain}>{c.isMain ? 'Main' : 'Reroll'}</span>
					<GameBadge character={c} importAt={data.gameImportAt} />
				</div>
				<p>
					Niv. {c.level}
					{raceName(cfg, c.race)}
					{className(cfg, c.class)} · {specRole(cfg, c.class, c.spec, c.role)}
				</p>
				{#if c.spec2 || c.role2}<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2, c.role2)}</p>{/if}
				{#if c.pve || c.pvp}<p><InterestBadges pve={c.pve} pvp={c.pvp} /></p>{/if}
				{#if c.professions.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}
				{#if c.recipes}<p class="muted small">Recettes : {c.recipes}</p>{/if}
				{#each c.knownRecipes ?? [] as k (k.profession)}
					<details class="known">
						<summary>{professionNames(cfg, [{ id: k.profession, level: k.skill }]) || k.profession} : {k.recipes.length} recettes connues</summary>
						<p class="small">{k.recipes.map((r) => r.name).sort((a, b) => a.localeCompare(b)).join(' · ')}</p>
					</details>
				{/each}
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
		gap: 1rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}
	.head img {
		width: 64px;
		height: 64px;
		border-radius: 50%;
	}
	.head > div {
		flex: 1;
		display: grid;
		gap: 0.35rem;
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
	}
	.roles,
	.known summary {
		cursor: pointer;
		font-size: 0.9rem;
	}
	.known p {
		margin: 0.3rem 0 0;
	}
	.rosters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.rosters a {
		color: var(--text);
		text-decoration: none;
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: 1rem;
	}
	article {
		display: grid;
		gap: 0.45rem;
		align-content: start;
	}
	article p {
		margin: 0;
	}
	article.main {
		border-color: var(--gold);
	}
	h2 {
		margin: 0;
		font-size: 1.2rem;
	}
	.small {
		font-size: 0.85rem;
		margin: 0;
	}
	.notes {
		white-space: pre-line;
	}
</style>
