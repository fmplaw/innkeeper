<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import MoneyInput from '$lib/components/MoneyInput.svelte';
	import { formatMoney } from '$lib/money';
	import { recipeUrl } from '$lib/wowhead';

	let { data, form } = $props();
	const cfg = $derived(data.config);
	type Order = (typeof data.orders)[number];

	const open = $derived(data.orders.filter((o) => o.status === 'open' || o.status === 'quoted'));
	const taken = $derived(data.orders.filter((o) => o.status === 'taken'));
	const closed = $derived(data.orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled'));
	// Commandes ouvertes d'une recette que je connais : en tête, mises en avant.
	const mine = (o: Order) => o.artisans.some((a) => a.playerId === data.me);
	const openSorted = $derived(open.toSorted((a, b) => Number(mine(b)) - Number(mine(a))));
	const placed = $derived(page.url.searchParams.get('passee'));
	const discordFailed = $derived(page.url.searchParams.get('discord') === '0');

	const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	// Mes commandes dont un prix attend ma réponse : tout en haut.
	const toAnswer = $derived(data.orders.filter((o) => o.can.accept));
	const DONE_LABELS: Record<string, string> = {
		take: 'Commande prise : le demandeur la voit à ton nom.',
		quote: 'Prix proposé : le demandeur est prévenu et doit l’accepter.',
		accept: 'Prix accepté : l’artisan s’en occupe.',
		refuse: 'Prix refusé : la commande est de nouveau ouverte aux autres artisans.', release: 'Commande rendue : elle est de nouveau ouverte.', deliver: 'Commande livrée.', cancel: 'Commande annulée.' };
</script>

<svelte:head><title>Commandes · {cfg.guild.name}</title></svelte:head>

<div class="page-head">
	<div>
		<h1>Commandes</h1>
		<p class="sub">Demande un craft aux artisans de la guilde, ou prends une commande que tu sais faire.</p>
	</div>
	<a class="button" href="/artisans">Commander une recette</a>
</div>

{#if placed}
	<p class="notice ok">
		Commande passée.
		{#if discordFailed}Le bot n'a pas pu l'annoncer sur Discord : préviens un officier.{:else if data.announced}Elle est annoncée sur Discord.{/if}
	</p>
{/if}
{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
{#if form?.done}<p class="notice ok">{DONE_LABELS[form.done]}</p>{/if}
{#each toAnswer as o (o.id)}
	<p class="notice warn">
		{o.quoter} propose <strong>{formatMoney(o.price)}</strong> pour ta commande de {o.quantity} × {o.recipeName}.
		<a href="#commande-{o.id}">Répondre</a>
	</p>
{/each}

{#if data.me}
	<form method="POST" action="?/alerts" use:enhance class="alerts">
		<label class="choice">
			<input type="checkbox" name="craftAlerts" checked={form?.alerts ?? data.craftAlerts} onchange={(e) => e.currentTarget.form?.requestSubmit()} />
			Me mentionner sur Discord quand quelqu'un commande une recette que je connais
		</label>
		<noscript><button class="secondary small">Enregistrer</button></noscript>
	</form>
{/if}

{#snippet card(o: Order)}
	<li class="card order" class:mine={o.status === 'open' && mine(o)} id="commande-{o.id}">
		<div class="top">
			<h3>
				<span class="qty num">{o.quantity} ×</span>
				<a href={recipeUrl(o.recipeId)} target="_blank" rel="noopener">{o.recipeName}</a>
			</h3>
			<span class="badge status {o.status}">
				{o.status === 'taken' ? `Prise par ${o.taker}` : o.status === 'open' ? 'Ouverte' : o.status === 'quoted' ? 'Prix proposé' : o.status === 'delivered' ? 'Livrée' : 'Annulée'}
			</span>
		</div>
		<p class="muted small">
			{o.professionName} · demandée par <a href="/joueurs/{o.requesterId}">{o.requester}</a> le {when.format(o.createdAt)}
		</p>
		{#if o.comment}<p class="comment">« {o.comment} »</p>{/if}
		<p class="small">
			<strong>Composants :</strong>
			{o.materials ? 'fournis par le demandeur' : 'à trouver par l’artisan'}
			{#if o.artisan}· <strong>Artisan souhaité :</strong> {o.artisan}{/if}
		</p>
		{#if o.reagents && o.status !== 'delivered' && o.status !== 'cancelled'}
			<p class="small">
				<strong>À réunir :</strong>
				{o.reagents}{#if o.cost}<span class="muted">{` · ≈ ${formatMoney(o.cost.total)} à l'hôtel des ventes${o.cost.missing.length ? ` (sans ${o.cost.missing.join(', ')})` : ''}`}</span>{/if}
			</p>
		{/if}
		{#if o.commission || o.budget || o.price}
			<p class="money small">
				{#if o.commission}<span><strong>Commission offerte :</strong> {formatMoney(o.commission)}</span>{/if}
				{#if o.budget && o.status === 'open'}<span><strong>Budget maximum :</strong> {formatMoney(o.budget)}</span>{/if}
				{#if o.price && o.status === 'quoted'}<span class="quote"><strong>{o.quoter} propose :</strong> {formatMoney(o.price)}, composants compris</span>{/if}
				{#if o.price && o.status !== 'quoted'}<span><strong>Prix convenu :</strong> {formatMoney(o.price)}</span>{/if}
			</p>
		{/if}
		{#if o.status === 'taken' && o.takenBy === data.me}
			<p class="muted small">
				Envoie la commande par courrier en jeu, en <strong>contre-remboursement</strong>{o.price || o.commission ? ` de ${formatMoney((o.price ?? 0) || (o.commission ?? 0))}` : ''} : le demandeur paie en la récupérant.
			</p>
		{/if}
		{#if o.status !== 'delivered' && o.status !== 'cancelled'}
			<p class="muted small">
				{#if o.artisans.length}
					La connaissent : {#each o.artisans as a, i (a.playerId + a.name)}{i ? ', ' : ''}<a href="/joueurs/{a.playerId}">{a.name}</a>{/each}
				{:else}
					Plus personne dans la guilde ne connaît cette recette.
				{/if}
			</p>
		{/if}
		{#if o.closedNote}<p class="muted small">{o.closedNote}</p>{/if}
		{#if o.can.quote}
			<details class="quote-form" open={form?.id === o.id}>
				<summary>Proposer un prix</summary>
				<form method="POST" action="?/quote" use:enhance class="quote-fields">
					<input type="hidden" name="id" value={o.id} />
					<MoneyInput name="price" label="Ton prix, composants et commission compris" hint={`${o.cost ? `Composants ≈ ${formatMoney(o.cost.total)} à l'HV. ` : ''}${o.budget ? `Dans le budget (${formatMoney(o.budget)} au plus), la commande est à toi tout de suite ; au-delà, le demandeur doit accepter.` : 'Le demandeur doit accepter ton prix.'}`} />
					<button>Proposer</button>
				</form>
			</details>
		{/if}
		{#if o.can.take || o.can.accept || o.can.refuse || o.can.release || o.can.deliver || o.can.cancel}
			<div class="row actions">
				{#if o.can.take}
					<form method="POST" action="?/take" use:enhance><input type="hidden" name="id" value={o.id} /><button>Je m'en occupe</button></form>
				{/if}
				{#if o.can.accept}
					<form method="POST" action="?/accept" use:enhance><input type="hidden" name="id" value={o.id} /><button>Accepter {formatMoney(o.price)}</button></form>
				{/if}
				{#if o.can.refuse}
					<form method="POST" action="?/refuse" use:enhance><input type="hidden" name="id" value={o.id} /><button class="secondary">Refuser</button></form>
				{/if}
				{#if o.can.deliver}
					<form method="POST" action="?/deliver" use:enhance><input type="hidden" name="id" value={o.id} /><button class={o.takenBy === data.me ? '' : 'secondary'}>Livrée</button></form>
				{/if}
				{#if o.can.release}
					<form method="POST" action="?/release" use:enhance>
						<input type="hidden" name="id" value={o.id} /><button class="secondary">{o.status === 'quoted' ? 'Retirer mon prix' : 'Je ne peux plus'}</button>
					</form>
				{/if}
				{#if o.can.cancel}
					<form method="POST" action="?/cancel" use:enhance={({ cancel }) => { if (!confirm('Annuler cette commande ?')) cancel(); }}>
						<input type="hidden" name="id" value={o.id} /><button class="secondary">Annuler</button>
					</form>
				{/if}
			</div>
		{/if}
	</li>
{/snippet}

<section>
	<h2>Ouvertes <span class="muted">({open.length})</span></h2>
	{#if openSorted.length}
		<ul class="list">{#each openSorted as o (o.id)}{@render card(o)}{/each}</ul>
	{:else}
		<p class="empty">Aucune commande en attente. Pour en passer une, cherche la recette dans <a href="/artisans">Artisans</a>.</p>
	{/if}
</section>

{#if taken.length}
	<section>
		<h2>En cours <span class="muted">({taken.length})</span></h2>
		<ul class="list">{#each taken as o (o.id)}{@render card(o)}{/each}</ul>
	</section>
{/if}

{#if closed.length}
	<section>
		<h2>Terminées ces 7 derniers jours <span class="muted">({closed.length})</span></h2>
		<ul class="list closed">{#each closed as o (o.id)}{@render card(o)}{/each}</ul>
	</section>
{/if}

<style>
	.alerts {
		margin-top: 1rem;
	}
	section {
		margin-top: 2rem;
	}
	h2 {
		margin: 0 0 0.75rem;
	}
	.list {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.order {
		display: grid;
		gap: 0.5rem;
		scroll-margin-top: 6rem;
	}
	.order:target {
		border-color: var(--accent);
	}
	.order.mine {
		border-color: color-mix(in oklab, var(--gold) 60%, var(--border));
	}
	.order p {
		margin: 0;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	h3 {
		margin: 0;
		font-size: 1.0625rem;
	}
	h3 a {
		color: var(--text);
	}
	h3 a:hover {
		color: var(--accent-ink);
	}
	.qty {
		color: var(--gold);
	}
	.status.open {
		border-color: var(--gold);
		color: var(--gold);
	}
	.comment {
		white-space: pre-line;
		font-style: italic;
	}
	.actions {
		gap: 0.5rem;
	}
	.money {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
	}
	.quote {
		color: var(--gold);
	}
	.quote-form summary {
		cursor: pointer;
		color: var(--accent-ink);
		font-size: 0.875rem;
	}
	.quote-fields {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.closed .order {
		opacity: 0.75;
	}
	.small {
		font-size: 0.875rem;
	}
</style>
