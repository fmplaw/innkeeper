<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';
	import CharacterTitle from '$lib/components/CharacterTitle.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { richText } from '$lib/format';
	import { professionNames, specRole } from '$lib/labels';

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

<a class="back" href="/admin/candidatures"><Glyph name="arrow-left" size={16} /> Candidatures</a>

<header class="head">
	{#if data.candidate.avatar}<img src={data.candidate.avatar} alt="" />{:else}<span class="initial" aria-hidden="true">{data.candidate.name[0]?.toUpperCase()}</span>{/if}
	<div>
		<h1>{data.candidate.name}</h1>
		<p class="muted">
			@{data.candidate.username} · déposée le {dateFormat.format(app.createdAt)}
		</p>
		{#if app.charterAcceptedAt}
			<p class="charter" class:changed={data.charterChangedAt}>
				<Glyph name="check" size={14} /> Charte acceptée le {dateFormat.format(app.charterAcceptedAt)}
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
		<p class="eyebrow">Le perso présenté</p>
		<CharacterTitle {cfg} character={{ name: c.name, surname: c.surname ?? null, class: c.class, spec: c.spec ?? null, role: c.role, race: c.race ?? null, level: Number(c.level ?? 1) }} big />
		{#if c.spec2 || c.role2}<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2 ?? null, c.role2 ?? null)}</p>{/if}
		{#if c.pve || c.pvp}<p><InterestBadges pve={c.pve ?? null} pvp={c.pvp ?? null} /></p>{/if}
		{#if c.professions?.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}
		{#if c.recipes}<p class="muted small">Recettes : {c.recipes}</p>{/if}
		{#if c.notes}<p class="muted small">{c.notes}</p>{/if}

		<p class="eyebrow answers-title">Ses réponses</p>
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
						<span class="vote-ic"><Glyph name={v.value > 0 ? 'thumbs-up' : 'thumbs-down'} size={15} /></span>
						{v.voterName}
						{#if v.comment}<p>{v.comment}</p>{/if}
					</li>
				{/each}
			</ul>

			{#if app.status === 'pending'}
				<form method="POST" action="?/vote" use:enhance={keepValues} class="vote">
					<div class="row" role="radiogroup" aria-label="Mon avis">
						<label class="pill up-pill"><input type="radio" name="value" value="1" bind:group={voteValue} /><span><Glyph name="thumbs-up" size={15} /> Pour</span></label>
						<label class="pill down-pill"><input type="radio" name="value" value="-1" bind:group={voteValue} /><span><Glyph name="thumbs-down" size={15} /> Contre</span></label>
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
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-weight: 500;
		text-decoration: none;
	}
	.head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 1.25rem;
		margin: 1.25rem 0 2.5rem;
	}
	.head img,
	.initial {
		width: 64px;
		height: 64px;
		border-radius: 50%;
	}
	.initial {
		display: grid;
		place-items: center;
		background: var(--tint);
		color: var(--accent-ink);
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 600;
	}
	.head div {
		flex: 1;
	}
	.head h1 {
		margin: 0;
	}
	.head p {
		margin: 0.15rem 0 0;
	}
	.status {
		padding: 0.25rem 0.875rem;
		border-radius: 999px;
		background: color-mix(in oklab, var(--gold) 14%, var(--bg));
		font-weight: 600;
		color: var(--gold);
	}
	.status.accepted {
		color: var(--good);
	}
	.status.refused,
	.status.withdrawn {
		color: var(--muted);
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(18rem, 2fr);
		gap: 2rem;
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
	.answers-title {
		margin-top: 1.25rem !important;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}
	.answers {
		margin: 0;
		display: grid;
		gap: 1.25rem;
	}
	.answers dt {
		color: var(--muted);
		font-size: 0.875rem;
	}
	/* Les réponses se lisent comme un texte, en caractères de lecture. */
	.answers dd {
		margin: 0.25rem 0 0;
		font-family: var(--font-read);
		font-size: 1.0625rem;
		line-height: 1.5;
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
		color: var(--good);
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
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		background: color-mix(in oklab, var(--good) 8%, var(--bg));
	}
	.votes li.negative {
		background: color-mix(in oklab, var(--danger) 8%, var(--bg));
	}
	.vote-ic {
		display: inline-flex;
		vertical-align: -0.15em;
		margin-right: 0.25rem;
		color: var(--good);
	}
	.negative .vote-ic {
		color: var(--danger);
	}
	.pill {
		margin: 0;
	}
	.pill input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.pill span {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 38px;
		padding: 0.25rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--muted);
		cursor: pointer;
	}
	.up-pill input:checked + span {
		border-color: transparent;
		background: color-mix(in oklab, var(--good) 14%, var(--bg));
		color: var(--good);
	}
	.down-pill input:checked + span {
		border-color: transparent;
		background: color-mix(in oklab, var(--danger) 14%, var(--bg));
		color: var(--danger);
	}
	.pill input:focus-visible + span {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
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
		color: var(--warn);
	}
	blockquote {
		margin: 0;
		padding: 0.625rem 0.875rem;
		border-radius: 10px;
		background: var(--tint);
		font-family: var(--font-read);
	}
	.ok {
		color: var(--good);
	}
	.charter {
		display: inline-block;
		margin: 0.35rem 0;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		font-size: 0.85rem;
		background: color-mix(in oklab, var(--good) 11%, var(--bg));
		color: var(--good);
	}
	.charter.changed {
		background: color-mix(in oklab, var(--warn) 11%, var(--bg));
		color: var(--warn);
	}
	.small {
		font-size: 0.88rem;
	}
</style>
