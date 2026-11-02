<script lang="ts">
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { className, classColor, fullName, professionNames, raceName, specRole } from '$lib/labels';
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
</script>

<h1>Ma candidature</h1>

<section class="card status {app.status}">
	<div class="row head">
		<span class="pill">{STATUS[app.status].label}</span>
		<span class="muted">Déposée le {dateFormat.format(app.createdAt)}</span>
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
	<h2 class="cls"><span class="dot" style:--c={classColor(cfg, c.class)}></span>{fullName({ name: c.name, surname: c.surname ?? null })}</h2>
	<p>
		Niv. {c.level}
		{raceName(cfg, c.race ?? null)}
		{className(cfg, c.class)} · {specRole(cfg, c.class, c.spec ?? null, c.role)}
	</p>
	{#if c.spec2 || c.role2}<p class="muted">Spé secondaire : {specRole(cfg, c.class, c.spec2 ?? null, c.role2 ?? null)}</p>{/if}
	{#if c.pve || c.pvp}<p><InterestBadges pve={c.pve ?? null} pvp={c.pvp ?? null} /></p>{/if}
	{#if c.professions?.length}<p class="muted">{professionNames(cfg, c.professions)}</p>{/if}

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
	.pill {
		padding: 0.25rem 0.8rem;
		border-radius: 999px;
		font-weight: 700;
		background: var(--surface-2);
	}
	.status.accepted {
		border-color: #3fb950;
	}
	.status.accepted .pill {
		background: color-mix(in srgb, #3fb950 20%, transparent);
		color: #56d364;
	}
	.status.refused .pill {
		color: var(--danger);
	}
	.status.pending .pill {
		color: var(--gold);
	}
	blockquote {
		margin: 0;
		padding: 0.5rem 1rem;
		border-left: 3px solid var(--accent);
		background: var(--surface-2);
	}
	h2 {
		margin: 0;
		font-size: 1.2rem;
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
	.small {
		font-size: 0.85rem;
	}
</style>
