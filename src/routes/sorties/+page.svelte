<script lang="ts">
	let { data } = $props();
	const day = $derived(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: data.timezone }));
	const hour = $derived(new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: data.timezone }));
</script>

<div class="head">
	<h1>Sorties</h1>
	{#if data.canCreate}<a class="button" href="/sorties/nouvelle">Nouvelle sortie</a>{:else if data.canPropose}<a class="button" href="/sorties/nouvelle">Proposer une sortie</a>{/if}
</div>

{#if data.deleted}<p class="card ok">Sortie supprimée, sur le site comme sur Discord.</p>{/if}
{#if data.eventsError}<p class="card warn">{data.eventsError}</p>{/if}
{#snippet list(events: NonNullable<typeof data.official>, empty: string)}
	{#if events.length}
		<ul class="events">
			{#each events as e (e.id)}
				<li>
					<a class="card event" href="/sorties/{e.id}">
						{#if e.image}<img class="thumb" src={e.image} alt="" loading="lazy" />{/if}
						<span class="date">
							<span class="day">{day.format(e.startTime * 1000)}</span>
							<span class="hour">{hour.format(e.startTime * 1000)}</span>
						</span>
						<span class="body">
							<strong>{e.title}</strong>
							<span class="muted small">
								{[e.leaderName && `Organisé par ${e.leaderName}`, e.channelName && `#${e.channelName}`].filter(Boolean).join(' · ')}
							</span>
						</span>
						{#if e.signUpCount !== null}<span class="count">{e.signUpCount} inscrit{e.signUpCount > 1 ? 's' : ''}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="card empty muted">{empty}</p>
	{/if}
{/snippet}

{#if data.official}
	{#if data.member}<h2>Sorties officielles</h2>{/if}
	{@render list(data.official, data.source === 'bot' ? "Aucune sortie à venir pour l'instant. Les sorties Raid-Helper postées dans les salons du serveur apparaissent ici." : "Aucune sortie à venir pour l'instant.")}
{/if}

{#if data.member}
	<div class="section-head">
		<h2>Sorties des membres</h2>
		{#if data.canPropose}<a class="button secondary" href="/sorties/nouvelle">Proposer une sortie</a>{/if}
	</div>
	{@render list(data.member, 'Aucune sortie proposée pour l’instant : lance la première ! Donjon, quêtes, farm… tout le monde peut proposer.')}
{/if}

<details class="card lookup" open={!data.official || data.invalid}>
	<summary>Retrouver un événement par son ID ou son lien</summary>
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
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	h2 {
		font-size: 1.15rem;
		margin: 1.25rem 0 0.75rem;
	}
	.section-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.section-head h2 {
		margin: 1.25rem 0 0.75rem;
	}
	.events {
		list-style: none;
		margin: 0 0 1.5rem;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.event {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: var(--text);
		text-decoration: none;
	}
	.event:hover {
		border-color: var(--accent);
	}
	.thumb {
		width: 7rem;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
	}
	.date {
		display: grid;
		min-width: 9.5rem;
	}
	.day {
		color: var(--gold);
		font-weight: 700;
		text-transform: capitalize;
	}
	.hour {
		font-variant-numeric: tabular-nums;
	}
	.body {
		flex: 1;
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}
	.count {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	@media (max-width: 30rem) {
		.event {
			flex-wrap: wrap;
		}
	}
	.empty {
		margin: 0 0 1.5rem;
	}
	.lookup {
		max-width: 44rem;
	}
	.lookup summary {
		cursor: pointer;
		color: var(--muted);
	}
	.lookup-form {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.lookup-form .row {
		flex-wrap: nowrap;
	}
	.small {
		font-size: 0.85rem;
		margin: 0;
	}
	.ok {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.warn {
		border-color: var(--gold);
		color: var(--gold);
		margin-bottom: 1rem;
	}
</style>
