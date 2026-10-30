<script lang="ts">
	import { AMBITION_ICONS, AMBITION_LABELS } from '$lib/guild';
	import { richText } from '$lib/format';
	import { ROLES, ROLE_LABELS } from '$lib/roles';

	let { data } = $props();
	const cfg = $derived(data.config);
	const profile = $derived(data.profile);
	const recruitment = $derived(profile?.recruitment);
	const classById = (id: string) => cfg.classes.find((c) => c.id === id);
	const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
</script>

<!-- Appel à l'action : rejoindre (visiteur) ou accéder à son espace (membre). -->
<section class="card cta">
	{#if data.user}
		<div>
			<h2>Bon retour, {data.user.displayName} !</h2>
			<p class="muted">Tiens ta fiche à jour pour aider les officiers à préparer les sorties.</p>
		</div>
		<div class="row">
			<a class="button" href="/persos">Mes persos</a>
			<a class="button secondary" href="/roster">Roster</a>
			<a class="button secondary" href="/sorties">Sorties</a>
		</div>
	{:else if data.candidate}
		<div>
			<h2>Bienvenue, {data.candidate.displayName} !</h2>
			<p class="muted">Suis ta candidature ou dépose-la si ce n'est pas encore fait.</p>
		</div>
		<div class="row"><a class="button" href="/candidature">Ma candidature</a></div>
	{:else}
		<div>
			<h2>Envie de nous rejoindre ?</h2>
			<p class="muted">
				{#if recruitment?.open}Le recrutement est ouvert : présente-toi et ton perso, les officiers étudient chaque
					candidature.{:else}Le recrutement est fermé pour le moment, mais tu peux passer nous voir sur Discord.{/if}
			</p>
		</div>
		<!-- « Se connecter » est déjà dans la barre de menu : pas de doublon ici. -->
		<div class="row">
			{#if recruitment?.open}<a class="button" href="/postuler">Postuler</a>{/if}
			{#if profile?.discordInvite}
				<a class="button secondary" href={profile.discordInvite} target="_blank" rel="noopener">Rejoindre le Discord</a>
			{/if}
		</div>
	{/if}
</section>

<div class="layout">
	<div class="main-col">
		{#if profile?.description}
			<section class="card prose">
				<h2>Qui sommes-nous ?</h2>
				{@html richText(profile.description)}
			</section>
		{/if}

		{#if profile?.schedule}
			<section class="card prose">
				<h2>Horaires et rythme</h2>
				{@html richText(profile.schedule)}
			</section>
		{/if}

		{#if data.stats}
			<section class="card">
				<h2>La guilde en chiffres</h2>
				<div class="figures">
					<div><strong>{data.stats.players}</strong><span>joueurs inscrits</span></div>
					<div><strong>{data.stats.characters}</strong><span>personnages</span></div>
				</div>
				{#if data.stats.mains}
					<h3>Rôles des mains</h3>
					{#each ROLES as r (r)}
						<div class="bar">
							<span>{ROLE_LABELS[r]}</span>
							<span class="track"><span class="fill" style:width="{pct(data.stats.byRole[r], data.stats.mains)}%"></span></span>
							<span class="count">{data.stats.byRole[r]}</span>
						</div>
					{/each}
					<h3>Classes des mains</h3>
					<div class="chips">
						{#each cfg.classes as c (c.id)}
							{#if data.stats.byClass[c.id]}
								<span class="chip" style:--class-color={c.color}>{c.name} <strong>{data.stats.byClass[c.id]}</strong></span>
							{/if}
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="side-col">
		{#if recruitment}
			<section class="card recruitment" class:open={recruitment.open}>
				<h2>Recrutement</h2>
				<p class="status">{recruitment.open ? 'Ouvert' : 'Fermé pour le moment'}</p>
				{#if recruitment.open}
					{#if recruitment.roles.length}
						<h3>Rôles recherchés</h3>
						<div class="chips">
							{#each recruitment.roles as r (r)}<span class="chip">{ROLE_LABELS[r]}</span>{/each}
						</div>
					{/if}
					{#if recruitment.classes.length}
						<h3>Classes recherchées</h3>
						<div class="chips">
							{#each recruitment.classes as id (id)}
								{@const c = classById(id)}
								{#if c}<span class="chip" style:--class-color={c.color}>{c.name}</span>{/if}
							{/each}
						</div>
					{/if}
					{#if recruitment.text}<div class="prose small">{@html richText(recruitment.text)}</div>{/if}
				{/if}
			</section>
		{/if}

		{#if profile?.ambitions.length}
			<section class="card">
				<h2>Ce qui nous anime</h2>
				<ul class="ambitions">
					{#each profile.ambitions as a (a)}
						<li><span aria-hidden="true">{AMBITION_ICONS[a]}</span> {AMBITION_LABELS[a]}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</aside>
</div>

<style>
	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
		border-color: color-mix(in srgb, var(--accent) 60%, var(--border));
	}
	.cta h2 {
		margin: 0 0 0.25rem;
	}
	.cta p {
		margin: 0;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
		gap: 1.5rem;
		align-items: start;
	}
	@media (max-width: 52rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.main-col,
	.side-col {
		display: grid;
		gap: 1.5rem;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.25rem;
		color: var(--gold);
	}
	h3 {
		margin: 1.25rem 0 0.5rem;
		font-size: 0.95rem;
		color: var(--muted);
	}
	.prose :global(p) {
		margin: 0 0 0.8rem;
		line-height: 1.65;
	}
	.prose :global(p:last-child) {
		margin-bottom: 0;
	}
	.prose :global(strong) {
		color: color-mix(in srgb, var(--accent) 45%, white);
	}
	.small {
		margin-top: 1rem;
		font-size: 0.92rem;
	}
	.figures {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2.5rem;
	}
	.figures div {
		display: flex;
		flex-direction: column;
	}
	.figures strong {
		font-size: 2rem;
		color: var(--gold);
		line-height: 1.1;
	}
	.figures span {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.bar {
		display: grid;
		grid-template-columns: 6.5rem 1fr 2rem;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.9rem;
		margin: 0.3rem 0;
	}
	.track {
		height: 0.55rem;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.count {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip {
		--class-color: var(--text);
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--class-color) 55%, transparent);
		color: var(--class-color);
		background: color-mix(in srgb, var(--class-color) 10%, transparent);
		font-size: 0.88rem;
	}
	.recruitment .status {
		display: inline-block;
		margin: 0;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
		font-weight: 600;
	}
	.recruitment.open {
		border-color: color-mix(in srgb, #3fb950 50%, var(--border));
	}
	.recruitment.open .status {
		background: color-mix(in srgb, #3fb950 20%, transparent);
		color: #56d364;
	}
	.ambitions {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.ambitions li {
		display: flex;
		gap: 0.6rem;
		align-items: center;
	}
	.ambitions span {
		font-size: 1.3rem;
	}
</style>
