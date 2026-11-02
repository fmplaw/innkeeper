<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { richText } from '$lib/format';
	import { className, classColor, fullName, professionNames, raceName, specRole } from '$lib/labels';

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const app = $derived(data.app);
	const c = $derived(app.character);
	const up = $derived(data.votes.filter((v) => v.value > 0));
	const down = $derived(data.votes.filter((v) => v.value < 0));
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

	let voteValue = $state<'1' | '-1'>('1');
	const STATUS = { pending: 'En attente', accepted: 'Acceptée', refused: 'Refusée', withdrawn: 'Retirée par le candidat' };
</script>

<p><a href="/admin/candidatures" class="muted">← Candidatures</a></p>

<header class="card head">
	{#if data.candidate.avatar}<img src={data.candidate.avatar} alt="" />{/if}
	<div>
		<h1>{data.candidate.name}</h1>
		<p class="muted">
			@{data.candidate.username} · déposée le {dateFormat.format(app.createdAt)}
		</p>
		{#if app.charterAcceptedAt}
			<p class="charter" class:changed={data.charterChangedAt}>
				✔ Charte acceptée le {dateFormat.format(app.charterAcceptedAt)}
				{#if data.charterChangedAt}{' '}· avant sa modification du {dateFormat.format(data.charterChangedAt)}{/if}
			</p>
		{/if}
		{#if data.discord}
			<p class="small">
				{#if data.discord.member}
					Déjà sur le serveur Discord{data.discord.roles.length ? ` · ${data.discord.roles.join(', ')}` : ' · aucun rôle'}
				{:else}
					Pas encore sur le serveur Discord
				{/if}
			</p>
		{/if}
	</div>
	<span class="status {app.status}">{STATUS[app.status]}</span>
</header>

{#if form?.error}<p class="notice bad">{form.error}</p>{/if}

<div class="layout">
	<section class="card">
		<h2 class="cls"><span class="dot" style:--c={classColor(cfg, c.class)}></span>{fullName({ name: c.name, surname: c.surname ?? null })}</h2>
		<p>
			Niv. {c.level}
			{raceName(cfg, c.race ?? null)}
			{className(cfg, c.class)} · {specRole(cfg, c.class, c.spec ?? null, c.role)}
		</p>
		{#if c.spec2 || c.role2}<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2 ?? null, c.role2 ?? null)}</p>{/if}
		{#if c.pve || c.pvp}<p><InterestBadges pve={c.pve ?? null} pvp={c.pvp ?? null} /></p>{/if}
		{#if c.professions?.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}
		{#if c.recipes}<p class="muted small">Recettes : {c.recipes}</p>{/if}
		{#if c.notes}<p class="muted small">{c.notes}</p>{/if}

		<dl class="answers">
			{#each app.answers as a, i (i)}
				<div>
					<dt>{a.question}</dt>
					<dd>{@html richText(a.answer)}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<aside class="side">
		<section class="card">
			<h2>Avis des officiers <span class="tally"><span class="up">+{up.length}</span> <span class="down">−{down.length}</span></span></h2>
			{#if data.votes.length === 0}<p class="muted">Aucun avis pour l'instant.</p>{/if}
			<ul class="votes">
				{#each data.votes as v (v.voterId)}
					<li class:negative={v.value < 0}>
						<strong>{v.value > 0 ? '+1' : '−1'}</strong>
						{v.voterName}
						{#if v.comment}<p>{v.comment}</p>{/if}
					</li>
				{/each}
			</ul>

			{#if app.status === 'pending'}
				<form method="POST" action="?/vote" use:enhance={keepValues} class="vote">
					<div class="row">
						<label class="choice"><input type="radio" name="value" value="1" bind:group={voteValue} /> +1</label>
						<label class="choice"><input type="radio" name="value" value="-1" bind:group={voteValue} /> −1</label>
					</div>
					<textarea
						name="comment"
						rows="2"
						maxlength="1000"
						required={voteValue === '-1'}
						placeholder={voteValue === '-1' ? 'Pourquoi ? (obligatoire)' : 'Commentaire (facultatif)'}
					>{data.myVote?.comment ?? ''}</textarea>
					<div class="row">
						<button class="secondary">{data.myVote ? 'Modifier mon avis' : 'Donner mon avis'}</button>
						{#if data.myVote}<button class="secondary" formaction="?/unvote" formnovalidate>Retirer mon avis</button>{/if}
					</div>
				</form>
			{/if}
		</section>

		{#if app.status === 'pending'}
			<section class="card decide">
				<h2>Décision</h2>
				<form method="POST" use:enhance>
					<label for="message">Message au candidat (facultatif)</label>
					<textarea id="message" name="message" rows="3" maxlength="1000" placeholder="Bienvenue parmi nous ! / Merci pour ta candidature…"></textarea>
					{#if down.length}
						<label class="choice warn">
							<input type="checkbox" name="confirm" />
							Accepter malgré {down.length} avis défavorable{down.length > 1 ? 's' : ''}
						</label>
					{/if}
					<div class="row">
						<button formaction="?/accept">Accepter</button>
						<button class="danger" formaction="?/refuse">Refuser</button>
					</div>
				</form>
			</section>
		{:else}
			<section class="card">
				<h2>Décision</h2>
				<p>
					{STATUS[app.status]}
					{#if app.decidedBy}par <strong>{app.decidedBy}</strong>{/if}
					{#if app.decidedAt}le {dateFormat.format(app.decidedAt)}{/if}
				</p>
				{#if app.decisionMessage}<blockquote>{app.decisionMessage}</blockquote>{/if}
				{#if app.status === 'accepted'}
					{#if app.roleAssignedAt}
						<p class="ok">Rôle d'arrivée attribué sur Discord le {dateFormat.format(app.roleAssignedAt)}.</p>
					{:else}
						<p class="muted">
							{#if app.inviteUrl}Invitation envoyée : le rôle sera attribué quand la recrue reviendra sur le site après avoir rejoint le serveur.
							{:else}Rôle d'arrivée pas encore attribué.{/if}
						</p>
						{#if form?.arrivalError}<p class="error">{form.arrivalError}</p>{/if}
						<form method="POST" action="?/retry" use:enhance>
							<button class="secondary">Réessayer l'arrivée sur Discord</button>
						</form>
					{/if}
				{/if}
			</section>
		{/if}
	</aside>
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.head img {
		width: 56px;
		height: 56px;
		border-radius: 50%;
	}
	.head div {
		flex: 1;
	}
	.head h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.head p {
		margin: 0.15rem 0 0;
	}
	.status {
		padding: 0.25rem 0.8rem;
		border-radius: 999px;
		background: var(--surface-2);
		font-weight: 700;
		color: var(--gold);
	}
	.status.accepted {
		color: #56d364;
	}
	.status.refused,
	.status.withdrawn {
		color: var(--muted);
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(18rem, 2fr);
		gap: 1rem;
		align-items: start;
	}
	@media (max-width: 52rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	section {
		display: grid;
		gap: 0.6rem;
	}
	section p {
		margin: 0;
	}
	.side {
		display: grid;
		gap: 1rem;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.answers {
		margin: 0.5rem 0 0;
		display: grid;
		gap: 0.75rem;
	}
	.answers dt {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.answers dd {
		margin: 0.2rem 0 0;
	}
	.answers :global(p) {
		margin: 0 0 0.4rem;
	}
	.tally {
		float: right;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.up {
		color: #56d364;
	}
	.down {
		color: var(--danger);
	}
	.votes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.votes li {
		padding: 0.4rem 0.6rem;
		border-left: 3px solid #3fb950;
		background: var(--surface-2);
		border-radius: 0 6px 6px 0;
	}
	.votes li.negative {
		border-left-color: var(--danger);
	}
	.votes li p {
		margin: 0.2rem 0 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.vote,
	.decide form {
		display: grid;
		gap: 0.5rem;
	}
	.choice {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text);
	}
	.warn {
		color: var(--gold);
	}
	blockquote {
		margin: 0;
		padding: 0.4rem 0.8rem;
		border-left: 3px solid var(--accent);
		background: var(--surface-2);
	}
	.ok {
		color: #56d364;
	}
	.charter {
		display: inline-block;
		margin: 0.35rem 0;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		font-size: 0.85rem;
		border: 1px solid color-mix(in srgb, #3fb950 55%, transparent);
		background: color-mix(in srgb, #3fb950 12%, transparent);
		color: #56d364;
	}
	.charter.changed {
		border-color: color-mix(in srgb, #e3a03a 55%, transparent);
		background: color-mix(in srgb, #e3a03a 12%, transparent);
		color: #e3a03a;
	}
	.small {
		font-size: 0.88rem;
	}
</style>
