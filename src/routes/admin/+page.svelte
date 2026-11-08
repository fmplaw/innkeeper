<script lang="ts">
	import GameBadge from '$lib/components/GameBadge.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import HomonymWarning from '$lib/components/HomonymWarning.svelte';
	import { className, classColor, fullName, specRole } from '$lib/labels';

	let { data } = $props();
	const cfg = $derived(data.config);
	const withoutCharacter = $derived(data.players.filter((p) => p.characters.length === 0).length);

	const PERMISSION_LABELS = { officer: 'Officier', member: 'Membre' } as const;
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	const dayFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	let copied = $state(false);

	// Mentions Discord (<@id>) à coller dans un message pour relancer tout le monde d'un coup.
	async function copyMentions() {
		const text = (data.missing ?? []).map((m) => `<@${m.id}>`).join(' ');
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

{#if data.welcome}
	<section class="card welcome">
		<h2>Installation terminée 🎉</h2>
		<ol>
			{#if data.discordReady}
				<li>Ouvre une fenêtre privée et connecte-toi avec Discord : tes rôles apparaîtront dans <a href="/admin/roles">Rôles Discord</a>.</li>
				<li>Désigne le ou les rôles <strong>Officier</strong>, et choisis qui peut accéder au site.</li>
			{:else}
				<li>Configure la <a href="/admin/discord">connexion Discord</a> : sans elle, les joueurs ne peuvent pas se connecter.</li>
			{/if}
			<li>Complète le <a href="/admin/guilde">profil de la guilde</a> quand tu veux.</li>
			<li>Partage l'adresse du site sur le Discord de la guilde.</li>
		</ol>
	</section>
{/if}

<div class="page-head">
	<div>
		<h1>Joueurs</h1>
		<p class="sub">{data.players.length} joueurs connectés au moins une fois · {withoutCharacter} sans perso renseigné</p>
	</div>
</div>

{#if data.missingError}<p class="notice warn">{data.missingError}</p>{/if}
{#if data.missing?.length}
	<details class="card missing" open>
		<summary>
			<strong>Sur Discord, sans compte sur le site</strong> <span class="muted">({data.missing.length})</span>
		</summary>
		<p class="muted small">
			Membres du serveur dont un rôle donne accès au site, mais qui ne s'y sont jamais connectés. Les Éclaireurs et les
			bots ne sont pas comptés.
		</p>
		<div class="row">
			<button class="secondary" onclick={copyMentions}>{copied ? 'Mentions copiées ✔' : 'Copier les mentions'}</button>
			<span class="muted small">À coller dans un message Discord pour les relancer d'un coup.</span>
		</div>
		<ul class="missing-list">
			{#each data.missing as m (m.id)}
				<li>
					{#if m.avatar}<img src={m.avatar} alt="" />{:else}<span class="no-avatar"></span>{/if}
					<span>
						<strong>{m.name}</strong>
						<span class="muted small">@{m.username} · {m.topRole ?? (m.permission === 'officer' ? 'Officier' : 'Membre')} · sur le Discord depuis le {dayFormat.format(m.joinedAt)}</span>
					</span>
				</li>
			{/each}
		</ul>
	</details>
{:else if data.missing}
	<p class="muted small">Tous les membres du Discord qui ont accès au site s'y sont déjà connectés.</p>
{/if}

<ul class="players">
	{#each data.players as p (p.id)}
		<li>
			<div class="head">
				{#if p.avatar}<img src={p.avatar} alt="" />{:else}<span class="initial" aria-hidden="true">{p.displayName[0]?.toUpperCase()}</span>{/if}
				<div class="who">
					<a href="/joueurs/{p.id}"><strong>{p.displayName}</strong></a>
					<span class="muted small">@{p.username} · vu le {dateFormat.format(p.lastLogin)}</span>
				</div>
				<span class="badge" class:main={p.permission === 'officer'} class:plain={!p.permission}>{p.permission ? PERMISSION_LABELS[p.permission] : 'Sans accès'}</span>
				<a class="button secondary small" href="/persos/nouveau?pour={p.id}"><Glyph name="plus" size={15} /> Perso</a>
			</div>
			{#if p.characters.length}
				<ul class="chars">
					{#each p.characters as c (c.id)}
						<li>
							<a href="/persos/{c.id}" class="cls"><span class="dot" style:--c={classColor(cfg, c.class)}></span>{fullName(c)}</a>
							{#if c.isMain}<span class="badge main">Main</span>{/if}
							<GameBadge character={c} importAt={data.gameImportAt} />
							<HomonymWarning homonyms={data.homonyms[c.id]} viewerId={p.id} compact />
							<span class="muted small">
								{className(cfg, c.class)}
								· {specRole(cfg, c.class, c.spec, c.role)}
								{#if c.spec2 || c.role2}/ {specRole(cfg, c.class, c.spec2, c.role2)}{/if}
								· niv. {c.level}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted small none">Aucun perso.</p>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.missing {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.missing summary {
		cursor: pointer;
	}
	.missing p {
		margin: 0;
	}
	.missing-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: 0.5rem 1rem;
	}
	.missing-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.missing-list li > span {
		display: grid;
		min-width: 0;
	}
	.missing-list img,
	.no-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--surface-2);
	}
	.welcome {
		margin-bottom: 2rem;
	}
	.welcome h2 {
		margin-top: 0;
	}
	.welcome ol {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.35rem;
	}
	.players {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.players > li {
		padding-block: 1.125rem;
		border-bottom: 1px solid var(--border);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
	}
	.head img,
	.initial {
		width: 38px;
		height: 38px;
		border-radius: 50%;
	}
	.initial {
		display: grid;
		place-items: center;
		background: var(--tint);
		color: var(--accent-ink);
		font-weight: 700;
	}
	.who {
		display: grid;
		flex: 1;
		min-width: 10rem;
		line-height: 1.35;
	}
	.who a {
		color: var(--text);
		text-decoration: none;
	}
	.who a:hover {
		color: var(--accent-ink);
	}
	.chars {
		list-style: none;
		display: grid;
		gap: 0.375rem;
		margin: 0.75rem 0 0 calc(38px + 1rem);
		padding: 0;
	}
	.chars li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.625rem;
	}
	.chars a {
		color: var(--text);
		font-weight: 500;
	}
	.none {
		margin: 0.5rem 0 0 calc(38px + 1rem);
	}
</style>
