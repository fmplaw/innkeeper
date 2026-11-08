<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();
	const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	// Liste des HV groupée par type de règles (JcE, JcJ…).
	const rulesets = $derived([...new Set(data.houses.map((h) => h.rulesetName))]);
	const prices = $derived(form && 'prices' in form ? form.prices : null);
</script>

<h1>Commandes de craft</h1>
<p class="muted intro">
	Les membres commandent une recette depuis la page <a href="/artisans">Artisans</a> et suivent leurs commandes dans
	<a href="/commandes">Commandes</a>. Le bot annonce chaque commande dans le salon choisi, puis met son message à jour quand elle est prise,
	livrée ou annulée.
</p>

{#if form && 'saved' in form && form.saved}<p class="notice ok">Réglages enregistrés.</p>{/if}
{#if prices}<p class="notice {prices.ok ? 'ok' : 'bad'}">{prices.message}</p>{/if}
{#if form && 'error' in form && form.error}<p class="notice bad">{form.error}</p>{/if}
{#if data.channelsError}<p class="notice warn">{data.channelsError}</p>{/if}

<form method="POST" use:enhance={keepValues} class="card form">
	<div>
		<label for="channelId">Salon des commandes</label>
		<select id="channelId" name="channelId" value={data.channelId ?? ''}>
			<option value="">— Aucun : les commandes restent sur le site —</option>
			{#each data.channels as ch (ch.id)}<option value={ch.id}># {ch.name}</option>{/each}
			{#if data.channelId && !data.channels.some((ch) => ch.id === data.channelId)}<option value={data.channelId}>Salon {data.channelId}</option>{/if}
		</select>
		<p class="hint muted">
			Conseillé : un salon où seul le bot écrit ; les membres discutent d'une commande dans un fil sous son annonce. Le bot doit
			pouvoir y voir le salon, envoyer des messages, intégrer des liens et lire l'historique.
		</p>
	</div>

	<div>
		<label for="auction">Hôtel des ventes (prix des composants)</label>
		{#if !data.battlenet}
			<p class="muted">Connecte d'abord Battle.net dans <a href="/admin/import">Import du jeu</a> : c'est lui qui donne les prix.</p>
			<input type="hidden" name="auction" value={data.auction} />
		{:else if data.housesError}
			<p class="notice warn">{data.housesError}</p>
			<input type="hidden" name="auction" value={data.auction} />
		{:else}
			<select id="auction" name="auction" value={data.auction}>
				<option value="">— Aucun : pas d'estimation de prix —</option>
				{#each rulesets as name (name)}
					<optgroup label={name}>
						{#each data.houses.filter((h) => h.rulesetName === name) as h (`${h.ruleset}:${h.house}`)}
							<option value="{h.ruleset}:{h.house}">{h.name} (n° {h.house})</option>
						{/each}
					</optgroup>
				{/each}
			</select>
			<p class="hint muted">
				Forever a plusieurs hôtels des ventes par faction ; choisis celui de la guilde. Pour le reconnaître, compare le prix d'un objet
				rare en jeu avec celui que le site affiche après l'enregistrement. Les prix sont relus toutes les heures ; pour chaque composant,
				le site prend la moyenne des 20 moins chers en vente.
			</p>
		{/if}
	</div>
	<div class="row"><button>Enregistrer</button></div>
</form>

{#if data.auction}
	<section class="card status">
		<h2>Prix de l'hôtel des ventes</h2>
		{#if data.auctionStatus}
			<p class:bad={!data.auctionStatus.ok}>
				Dernière lecture le {when.format(data.auctionStatus.at)} : {data.auctionStatus.message}
			</p>
		{:else}
			<p class="muted">Pas encore lus.</p>
		{/if}
		<p class="muted small">{data.pricedItems} objets ont un prix connu.</p>
		<form method="POST" action="?/prices" use:enhance>
			<button class="secondary small">Relire les prix maintenant</button>
		</form>
	</section>
{/if}

<style>
	.intro {
		max-width: 75ch;
	}
	.status {
		display: grid;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}
	.status h2,
	.status p {
		margin: 0;
	}
	.status .bad {
		color: var(--bad, #e5534b);
	}
	.small {
		font-size: 0.875rem;
	}
</style>
