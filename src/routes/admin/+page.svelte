<script lang="ts">
	import GameBadge from '$lib/components/GameBadge.svelte';
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

<h1>Joueurs</h1>
<p class="muted">
	{data.players.length} joueurs connectés au moins une fois · {withoutCharacter} sans perso renseigné
</p>

{#if data.missingError}<p class="card warn">{data.missingError}</p>{/if}
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

<div class="players">
	{#each data.players as p (p.id)}
		<article class="card">
			<div class="row head">
				{#if p.avatar}<img src={p.avatar} alt="" />{/if}
				<div class="who">
					<a href="/joueurs/{p.id}"><strong>{p.displayName}</strong></a>
					<span class="muted">@{p.username}</span>
				</div>
				<span class="badge">{p.permission ? PERMISSION_LABELS[p.permission] : 'Sans accès'}</span>
				<span class="muted small">Dernière connexion : {dateFormat.format(p.lastLogin)}</span>
				<a class="button secondary" href="/persos/nouveau?pour={p.id}">Ajouter un perso</a>
			</div>
			{#if p.characters.length}
				<ul>
					{#each p.characters as c (c.id)}
						<li>
							<a href="/persos/{c.id}" style:color={classColor(cfg, c.class)}>{fullName(c)}</a>
							<GameBadge character={c} importAt={data.gameImportAt} />
							{#if c.isMain}<span class="badge main">Main</span>{/if}
							<span class="muted">
								{className(cfg, c.class)}
								· {specRole(cfg, c.class, c.spec, c.role)}
								{#if c.spec2 || c.role2}/ {specRole(cfg, c.class, c.spec2, c.role2)}{/if}
								· niv. {c.level}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted">Aucun perso.</p>
			{/if}
		</article>
	{/each}
</div>

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
	.warn {
		border-color: var(--gold);
		color: var(--gold);
		margin-bottom: 1rem;
	}
	.welcome {
		border-color: var(--gold);
		margin-bottom: 1.5rem;
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
		display: grid;
		gap: 0.75rem;
	}
	.head img {
		width: 36px;
		height: 36px;
		border-radius: 50%;
	}
	.who {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 10rem;
	}
	.small {
		font-size: 0.85rem;
	}
	ul {
		margin: 0.75rem 0 0;
		padding-left: 1.25rem;
	}
	li {
		margin: 0.2rem 0;
	}
</style>
