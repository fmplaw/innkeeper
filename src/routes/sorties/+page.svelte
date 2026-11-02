<script lang="ts">
	import Glyph from '$lib/components/Glyph.svelte';
	import OutingIcon from '$lib/components/OutingIcon.svelte';

	let { data } = $props();
	const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: data.timezone });
	const dayNum = $derived(fmt({ day: 'numeric' }));
	const weekday = $derived(fmt({ weekday: 'long' }));
	const hour = $derived(fmt({ hour: '2-digit', minute: '2-digit' }));
	const month = $derived(fmt({ month: 'long', year: 'numeric' }));
	const all = $derived([...(data.official ?? []), ...(data.member ?? [])]);
	const next = $derived(all.toSorted((a, b) => a.startTime - b.startTime)[0]);
	const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
	const fromNow = (t: number) => {
		const days = Math.round((t * 1000 - Date.now()) / 86_400_000);
		return days < 1 ? "aujourd'hui" : relative.format(days, 'day');
	};
	// Regroupe par mois, dans l'ordre d'arrivée (déjà chronologique).
	const byMonth = <T extends { startTime: number }>(events: T[]) => {
		const groups: { label: string; events: T[] }[] = [];
		for (const e of events) {
			const label = month.format(e.startTime * 1000);
			if (groups.at(-1)?.label !== label) groups.push({ label, events: [] });
			groups.at(-1)!.events.push(e);
		}
		return groups;
	};
</script>

<div class="page-head">
	<div>
		<h1>Sorties</h1>
		{#if next}<p class="sub">Prochaine sortie {fromNow(next.startTime)}, à {hour.format(next.startTime * 1000)} : {next.title}.</p>{/if}
	</div>
	{#if data.canCreate}
		<a class="button" href="/sorties/nouvelle"><Glyph name="plus" size={18} /> Nouvelle sortie</a>
	{:else if data.canPropose}
		<a class="button" href="/sorties/nouvelle"><Glyph name="plus" size={18} /> Proposer une sortie</a>
	{/if}
</div>

{#if data.deleted}<p class="notice ok"><Glyph name="check" /> Sortie supprimée, sur le site comme sur Discord.</p>{/if}
{#if data.eventsError}<p class="notice warn"><Glyph name="warning" /> {data.eventsError}</p>{/if}

{#snippet list(events: NonNullable<typeof data.official>, empty: string)}
	{#if events.length}
		{#each byMonth(events) as group (group.label)}
			<h3 class="month">{group.label}</h3>
			<ol class="events">
				{#each group.events as e (e.id)}
					<li>
						<a class="event" href="/sorties/{e.id}">
							<span class="when">
								<span class="serif num day">{dayNum.format(e.startTime * 1000)}</span>
								<span class="muted small">{weekday.format(e.startTime * 1000)}<br />{' '}{hour.format(e.startTime * 1000)}</span>
							</span>
							<OutingIcon activity={e.type?.activity} size={48} />
							<span class="what">
								<span class="serif title">{e.title}</span>
								<span class="muted small">
									<!-- Type connu pour les sorties créées depuis le site ; les autres viennent de Discord. -->
									<strong class="type {e.type?.activity ?? 'other'}">{e.type?.label ?? 'Événement Discord'}</strong>
									{[e.leaderName && `organisé par ${e.leaderName}`, e.channelName && `#${e.channelName}`].filter(Boolean).map((t) => ` · ${t}`).join('')}
								</span>
							</span>
							{#if e.signUpCount !== null}<span class="count num">{e.signUpCount} inscrit{e.signUpCount > 1 ? 's' : ''}</span>{/if}
							<span class="go" aria-hidden="true"><Glyph name="chevron-right" /></span>
						</a>
					</li>
				{/each}
			</ol>
		{/each}
	{:else}
		<p class="empty">{empty}</p>
	{/if}
{/snippet}

{#if data.official}
	<section class="group">
		{#if data.member}<h2>Sorties officielles</h2>{/if}
		{@render list(data.official, data.source === 'bot' ? "Aucune sortie à venir pour l'instant. Les sorties Raid-Helper postées dans les salons du serveur apparaissent ici." : "Aucune sortie à venir pour l'instant.")}
	</section>
{/if}

{#if data.member}
	<section class="group">
		<div class="section-head">
			<h2>Sorties des membres</h2>
			{#if data.canPropose && data.canCreate}<a class="button secondary small" href="/sorties/nouvelle">Proposer une sortie</a>{/if}
		</div>
		{@render list(data.member, 'Aucune sortie proposée pour l’instant : lance la première ! Donjon, quêtes, farm… tout le monde peut proposer.')}
	</section>
{/if}

<details class="lookup" open={!data.official || data.invalid}>
	<summary class="muted">Retrouver un événement par son ID ou son lien</summary>
	<form method="GET" class="lookup-form">
		<div class="row">
			<input id="evenement" name="evenement" required placeholder="123456789012345678" aria-label="ID ou lien de l'événement" />
			<button class="secondary">Voir la composition</button>
		</div>
		{#if data.invalid}<p class="error">Aucun identifiant d'événement trouvé dans ce texte.</p>{/if}
		<p class="muted small">
			Dans Discord (mode développeur activé) : clic droit sur le message Raid-Helper → Copier l'identifiant du
			message. Un lien vers le message ou vers raid-helper.dev fonctionne aussi.
		</p>
	</form>
</details>

<style>
	.group + .group {
		margin-top: 3.5rem;
	}
	.group h2 {
		margin: 0;
	}
	.section-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.month {
		margin: 2rem 0 0;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
		font-size: 1rem;
	}
	.month::first-letter {
		text-transform: uppercase;
	}
	.events {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.event {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1.25rem 0.5rem;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		text-decoration: none;
		transition: background 0.15s;
	}
	.event:hover {
		background: color-mix(in srgb, var(--accent) 7%, transparent);
	}
	.event:hover .title {
		color: var(--accent-ink);
	}
	.when {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 8rem;
		line-height: 1.25;
	}
	.day {
		min-width: 3rem;
		font-size: 2.75rem;
		line-height: 1;
	}
	/* Type de sortie dans la couleur de son médaillon. */
	.type {
		font-weight: 600;
		color: var(--gold);
	}
	.type.quests {
		color: #ffd34a;
	}
	.type.dungeon {
		color: #6cc6ff;
	}
	.type.raid {
		color: #8fe04a;
	}
	.type.pvp {
		color: #ef7a6c;
	}
	.type.farm {
		color: #d9a46a;
	}
	.type.other {
		color: var(--muted);
	}
	.what {
		flex: 1;
		display: grid;
		gap: 0.1875rem;
		min-width: 0;
	}
	.title {
		font-size: 1.375rem;
		line-height: 1.25;
		transition: color 0.15s;
	}
	.count {
		white-space: nowrap;
		color: var(--muted);
	}
	.go {
		display: inline-flex;
		color: var(--muted);
	}
	.lookup {
		max-width: 44rem;
		margin-top: 3rem;
	}
	.lookup-form {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.lookup-form .row {
		flex-wrap: nowrap;
	}
	.lookup-form p {
		margin: 0;
	}
	@media (max-width: 640px) {
		.event {
			flex-wrap: wrap;
			gap: 0.5rem 1rem;
			padding-inline: 0;
		}
		.when {
			width: 100%;
		}
		.day {
			min-width: 0;
			font-size: 2rem;
		}
		.when br {
			display: none;
		}
		.go {
			display: none;
		}
		.lookup-form .row {
			flex-wrap: wrap;
		}
	}
</style>
