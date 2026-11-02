<script lang="ts">
	import type { Status } from './+page.server';

	let { data } = $props();

	const BADGES: Record<Status, { label: string; class: string }> = {
		ok: { label: 'Fonctionne', class: 'good' },
		warn: { label: 'À surveiller', class: 'warn' },
		error: { label: 'En panne', class: 'bad' },
		idle: { label: 'Pas encore appelé', class: 'plain' },
		off: { label: 'Non configuré', class: 'plain' }
	};
</script>

<h1>État</h1>
<p class="muted intro">
	Ce qui marche et ce qui coince : Discord, le bot, Raid-Helper, la synchro et les sauvegardes. Les pannes sont
	notées depuis le dernier démarrage du site, le {data.startedAt?.date} (version {data.version}). Visible par l'admin
	de l'instance uniquement.
</p>

<section>
	<h2>Services</h2>
	<ul class="rows">
		{#each data.services as s (s.key)}
			<li class="card row-item">
				<div class="head">
					<strong>{s.name}</strong>
					<span class="badge {BADGES[s.status].class}">{BADGES[s.status].label}</span>
				</div>
				<p class="muted">{s.role}</p>
				{#if s.status === 'off'}
					<p class="muted">
						{#if s.key === 'raidhelper'}Clé API à régler dans <a href="/admin/sorties">Admin → Sorties</a>.
						{:else if s.key === 'bot'}Token du bot à régler dans <a href="/admin/discord">Connexion Discord</a>.
						{:else}Application à régler dans <a href="/admin/discord">Connexion Discord</a>.{/if}
					</p>
				{:else}
					<dl>
						<div><dt>Dernière réponse correcte</dt><dd>{s.okAt ? `${s.okAt.ago} (${s.okAt.date})` : '—'}</dd></div>
						{#if s.error}
							<div class="error">
								<dt>Dernière panne</dt>
								<dd>{s.error.ago} ({s.error.date}) : {s.error.message}</dd>
							</div>
							<div><dt>Pannes depuis le démarrage</dt><dd>{s.failures}</dd></div>
						{/if}
					</dl>
				{/if}
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2>Joueurs et synchro</h2>
	<ul class="rows">
		<li class="card row-item">
			<div class="head">
				<strong>Rôles Discord</strong>
				<span class="badge {BADGES[data.roles.status].class}">{BADGES[data.roles.status].label}</span>
			</div>
			<dl>
				<div><dt>Joueurs présents sur le serveur</dt><dd>{data.roles.members}</dd></div>
				<div><dt>Dernière relecture par le bot</dt><dd>{data.roles.lastCheck ? `${data.roles.lastCheck.ago} (${data.roles.lastCheck.date})` : 'jamais'}</dd></div>
			</dl>
		</li>
		<li class="card row-item">
			<div class="head"><strong>Synchronisation du jeu</strong></div>
			<dl>
				<div><dt>Dernier envoi d'InnkeeperSync</dt><dd>{data.sync.lastSync ? `${data.sync.lastSync.ago} (${data.sync.lastSync.date})` : 'aucun'}</dd></div>
				<div>
					<dt>Dernier registre de guilde appliqué</dt>
					<dd>{data.sync.lastImport ? `${data.sync.lastImport.ago} (${data.sync.lastImport.date}), ${data.sync.lastImport.rosterSize} persos` : 'aucun'}</dd>
				</div>
			</dl>
		</li>
	</ul>
</section>

<section>
	<h2>Sauvegarde</h2>
	<div class="card row-item">
		<div class="head">
			<strong>Base de données</strong>
			<span class="badge {BADGES[data.backup.status].class}">{!data.backup.latest ? 'Aucune copie' : data.backup.status === 'ok' ? 'À jour' : 'Ancienne'}</span>
		</div>
		{#if data.backup.latest}
			<dl>
				<div><dt>Dernière copie</dt><dd>{data.backup.latest.ago} ({data.backup.latest.date}), {data.backup.latest.megabytes} Mo</dd></div>
				<div><dt>Fichier</dt><dd><code>{data.backup.dir}/{data.backup.latest.file}</code></dd></div>
			</dl>
			{#if data.backup.status === 'warn'}<p class="muted">Plus d'un jour et demi sans copie : la tâche planifiée tourne-t-elle encore ?</p>{/if}
		{:else}
			<p class="muted">
				Aucune copie dans <code>{data.backup.dir}</code>. Planifie chaque nuit
				<code>docker compose exec -T site node scripts/backup.mjs</code> (cron ou timer systemd), avec <code>/backups</code>
				monté sur un autre disque : voir le README.
			</p>
		{/if}
	</div>
</section>

<style>
	.intro {
		max-width: 65ch;
	}
	section {
		margin-top: 1.5rem;
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.row-item {
		padding: 0.8rem 1rem;
		display: grid;
		gap: 0.35rem;
	}
	.row-item p {
		margin: 0;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 0.2rem;
		font-size: 0.92rem;
	}
	dl div {
		display: grid;
		grid-template-columns: 16rem 1fr;
		gap: 0.75rem;
	}
	@media (max-width: 40rem) {
		dl div {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.error dd {
		color: var(--danger);
	}
	.badge.bad {
		background: color-mix(in oklab, var(--danger) 12%, var(--bg));
		color: var(--danger);
	}
</style>
