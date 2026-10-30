<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';
	import { className, classColor } from '$lib/labels';

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	const isoDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

	function seniority(days: number) {
		if (days < 31) return `${days} jour${days > 1 ? 's' : ''}`;
		const months = Math.floor(days / 30.44);
		return `${months} mois`;
	}

	const due = $derived(data.newcomers.filter((n) => n.due));
	const others = $derived(data.newcomers.filter((n) => !n.due));
</script>

<h1>Progression</h1>

{#if !data.arrivalRole}
	<p class="card warn">
		Choisis d'abord le rôle d'arrivée des recrues dans <a href="/admin/recrutement">Recrutement</a> : c'est lui qui
		désigne les nouveaux membres à suivre.
	</p>
{:else}
	<p class="muted intro">
		Membres portant le rôle <strong>{data.arrivalRole}</strong>, du plus ancien au plus récent. Au-delà de
		{data.reviewDays} jours (réglable dans <a href="/admin/recrutement">Recrutement</a>), ils sont signalés pour
		qu'un officier décide d'une promotion. La promotion se fait sur Discord ; « Revu » repousse le rappel de 30 jours.
	</p>
	{#if form?.error}<p class="card error">{form.error}</p>{/if}

	{#snippet member(n: (typeof data.newcomers)[number])}
		<li class="card member" class:due={n.due}>
			<div class="who">
				{#if n.avatar}<img src={n.avatar} alt="" />{/if}
				<div>
					<a href="/joueurs/{n.id}"><strong>{n.name}</strong></a>
					{#if n.main}
						<span class="muted">
							· <span style:color={classColor(cfg, n.main.class)}>{n.main.name}</span>
							{className(cfg, n.main.class)} niv. {n.main.level}
						</span>
					{/if}
					<div class="muted small">
						Arrivé le {dateFormat.format(n.arrival)}{n.arrivalKnown ? '' : ' (première connexion au site, approximatif)'}
						· {seniority(n.days)}
					</div>
					{#if n.reviewedAt}
						<div class="muted small">
							Revu le {dateFormat.format(n.reviewedAt)}{n.reviewNote ? ` : « ${n.reviewNote} »` : ''}
						</div>
					{/if}
				</div>
				{#if n.due}<span class="badge due-badge">À revoir</span>{/if}
			</div>
			<div class="actions">
				<form method="POST" action="?/review" use:enhance={keepValues} class="row">
					<input type="hidden" name="userId" value={n.id} />
					<input name="note" maxlength="300" placeholder="Note (facultatif)" aria-label="Note de revue pour {n.name}" />
					<button class="secondary">Revu, on garde le rôle</button>
				</form>
				<form method="POST" action="?/joined" use:enhance={keepValues} class="row">
					<input type="hidden" name="userId" value={n.id} />
					<input type="date" name="date" value={isoDate(n.arrival)} aria-label="Date d'arrivée de {n.name}" />
					<button class="secondary">Corriger l'arrivée</button>
				</form>
			</div>
		</li>
	{/snippet}

	<h2>À revoir <span class="muted">({due.length})</span></h2>
	{#if due.length}
		<ul class="list">{#each due as n (n.id)}{@render member(n)}{/each}</ul>
	{:else}
		<p class="muted">Personne pour l'instant.</p>
	{/if}

	<h2>Autres nouveaux membres <span class="muted">({others.length})</span></h2>
	{#if others.length}
		<ul class="list">{#each others as n (n.id)}{@render member(n)}{/each}</ul>
	{:else}
		<p class="muted">Aucun.</p>
	{/if}
{/if}

<style>
	.intro {
		max-width: 70ch;
	}
	h2 {
		font-size: 1.1rem;
		margin: 1.5rem 0 0.75rem;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.member {
		display: grid;
		gap: 0.6rem;
	}
	.member.due {
		border-color: var(--gold);
	}
	.who {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.who > div {
		flex: 1;
	}
	.who img {
		width: 36px;
		height: 36px;
		border-radius: 50%;
	}
	.due-badge {
		border-color: var(--gold);
		color: var(--gold);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
	}
	.actions input:not([type='hidden']) {
		width: auto;
	}
	.actions input[name='note'] {
		min-width: 14rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.warn {
		border-color: var(--gold);
		color: var(--gold);
	}
	p.card.error {
		margin-bottom: 1rem;
	}
</style>
