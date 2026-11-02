<script lang="ts">
	import CharacterTitle from '$lib/components/CharacterTitle.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { professionNames, specRole } from '$lib/labels';
	import { richText } from '$lib/format';

	let { data } = $props();
	const cfg = $derived(data.config);
	const app = $derived(data.app);
	const c = $derived(app.character);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

	const STATUS = {
		pending: { label: 'En cours d’examen', text: 'Les officiers étudient ta candidature. La réponse s’affichera sur cette page ; si tu es déjà sur notre serveur Discord, le bot te la donnera aussi par message privé.' },
		accepted: { label: 'Acceptée', text: 'Bienvenue dans la guilde !' },
		refused: { label: 'Non retenue', text: 'Ta candidature n’a pas été retenue cette fois-ci.' },
		withdrawn: { label: 'Retirée', text: 'Tu as retiré ta candidature.' }
	} as const;

	// Étapes de la candidature : où on en est, d'un coup d'œil.
	const steps = $derived.by(() => {
		const decided = app.status === 'accepted' || app.status === 'refused';
		const list = [
			{ label: 'Déposée', detail: dateFormat.format(app.createdAt), done: true, current: false },
			{ label: 'Examen par les officiers', detail: '', done: decided, current: app.status === 'pending' },
			{ label: app.status === 'refused' ? 'Non retenue' : 'Décision', detail: '', done: decided, current: false }
		];
		if (app.status !== 'refused') list.push({ label: 'Arrivée sur le Discord', detail: '', done: Boolean(app.roleAssigned), current: app.status === 'accepted' && !app.roleAssigned });
		return list;
	});
</script>

<div class="page-head"><h1>Ma candidature</h1></div>

{#if app.status !== 'withdrawn'}
	<ol class="steps">
		{#each steps as step, i (i)}
			<li class:done={step.done} class:current={step.current}>
				<span class="bullet" aria-hidden="true">{#if step.done}<Glyph name="check" size={14} />{:else}{i + 1}{/if}</span>
				<span class="step-label">{step.label}{#if step.detail}<span class="muted small">{step.detail}</span>{/if}</span>
			</li>
		{/each}
	</ol>
{/if}

<section class="card status {app.status}">
	<div class="row head">
		<span class="pill">{STATUS[app.status].label}</span>
		<span class="muted small">Déposée le {dateFormat.format(app.createdAt)}</span>
	</div>
	<p>{STATUS[app.status].text}</p>
	{#if app.decisionMessage}
		<blockquote>{@html richText(app.decisionMessage)}</blockquote>
	{/if}

	{#if app.status === 'accepted'}
		{#if app.roleAssigned}
			<p>Tu as reçu ton rôle sur le Discord. <a class="button" href="/persos">Accéder à mon espace</a></p>
		{:else if data.canJoin}
			<p>Il te reste à rejoindre notre serveur Discord : autorise-nous sur Discord et tu y entres directement, avec ton rôle.</p>
			{#if data.joinError}<p class="error">{data.joinError}</p>{/if}
			<p class="row"><a class="button" href="/candidature/rejoindre" data-sveltekit-reload>Rejoindre le serveur Discord</a></p>
			{#if app.inviteUrl}
				<p class="muted small">
					Ça ne fonctionne pas ? <a href={app.inviteUrl} target="_blank" rel="noopener">Lien d'invitation classique</a>
					(personnel, valable 7 jours), puis <a href="/candidature" data-sveltekit-reload>reviens sur cette page</a>.
				</p>
			{/if}
		{:else if app.inviteUrl}
			<p>Il te reste à rejoindre notre serveur Discord. Une fois dessus, reviens sur cette page : ton rôle te sera attribué automatiquement.</p>
			<p class="row">
				<a class="button" href={app.inviteUrl} target="_blank" rel="noopener">Rejoindre le serveur Discord</a>
				<a class="button secondary" href="/candidature" data-sveltekit-reload>J'ai rejoint le serveur</a>
			</p>
			<p class="muted small">Lien personnel, valable 7 jours et utilisable une seule fois.</p>
		{/if}
		{#if data.arrivalError}<p class="muted small">Ton arrivée n'est pas encore finalisée, un officier va s'en occuper.</p>{/if}
	{/if}

	{#if app.status === 'pending'}
		<form
			method="POST"
			action="?/withdraw"
			onsubmit={(e) => {
				if (!window.confirm('Retirer ta candidature ?')) e.preventDefault();
			}}
		>
			<button class="secondary">Retirer ma candidature</button>
		</form>
	{:else if app.status === 'withdrawn'}
		<p><a class="button" href="/postuler">Postuler à nouveau</a></p>
	{/if}
</section>

<section class="card">
	<p class="eyebrow">Le perso présenté</p>
	<CharacterTitle {cfg} character={{ name: c.name, surname: c.surname ?? null, class: c.class, spec: c.spec ?? null, role: c.role, race: c.race ?? null, level: Number(c.level ?? 1) }} big />
	{#if c.spec2 || c.role2}<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2 ?? null, c.role2 ?? null)}</p>{/if}
	{#if c.pve || c.pvp}<p><InterestBadges pve={c.pve ?? null} pvp={c.pvp ?? null} /></p>{/if}
	{#if c.professions?.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}

	<p class="eyebrow answers-title">Tes réponses</p>
	<dl class="answers">
		{#each app.answers as a, i (i)}
			<div>
				<dt>{a.question}</dt>
				<dd>{@html richText(a.answer)}</dd>
			</div>
		{/each}
	</dl>
</section>

<style>
	section {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	section p {
		margin: 0;
	}
	.head {
		justify-content: space-between;
	}
	.steps {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 0;
		margin: 0 0 2rem;
		padding: 0;
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		color: var(--muted);
	}
	/* Trait entre deux étapes. */
	.steps li:not(:last-child)::after {
		content: '';
		width: clamp(1.5rem, 5vw, 4rem);
		height: 1px;
		margin-inline: 0.75rem;
		background: var(--border-strong);
	}
	.bullet {
		flex: none;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px var(--border-strong);
		font-size: 0.8125rem;
		font-weight: 600;
	}
	.done {
		color: var(--text);
	}
	.done .bullet {
		background: color-mix(in oklab, var(--good) 16%, var(--bg));
		box-shadow: none;
		color: var(--good);
	}
	.current {
		color: var(--text);
		font-weight: 600;
	}
	.current .bullet {
		background: var(--tint);
		box-shadow: inset 0 0 0 1px var(--accent);
		color: var(--accent-ink);
	}
	.step-label {
		display: grid;
		line-height: 1.25;
	}
	/* Téléphone : les étapes s'empilent, sans trait de liaison. */
	@media (max-width: 640px) {
		.steps {
			flex-direction: column;
		}
		.steps li:not(:last-child)::after {
			display: none;
		}
	}
	.pill {
		padding: 0.25rem 0.875rem;
		border-radius: 999px;
		font-weight: 600;
		background: color-mix(in oklab, var(--gold) 14%, var(--bg));
		color: var(--gold);
	}
	.status.accepted .pill {
		background: color-mix(in oklab, var(--good) 14%, var(--bg));
		color: var(--good);
	}
	.status.refused .pill {
		background: color-mix(in oklab, var(--danger) 12%, var(--bg));
		color: var(--danger);
	}
	.status.withdrawn .pill {
		background: var(--surface-2);
		color: var(--muted);
	}
	blockquote {
		margin: 0;
		padding: 0.625rem 1rem;
		border-radius: 10px;
		background: var(--tint);
		font-family: var(--font-read);
	}
	.answers-title {
		margin-top: 0.75rem !important;
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
	.small {
		font-size: 0.85rem;
	}
</style>
