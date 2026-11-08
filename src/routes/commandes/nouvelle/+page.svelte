<script lang="ts">
	import { enhance } from '$app/forms';
	import MoneyInput from '$lib/components/MoneyInput.svelte';
	import { keepValues } from '$lib/forms';
	import { formatMoney } from '$lib/money';
	import { craftsFor, reagentCost, reagentList } from '$lib/recipes';
	import { recipeUrl } from '$lib/wowhead';

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const professionName = (id: string) => cfg.professions.find((p) => p.id === id)?.name ?? id;
	let materials = $state('provided');
	let quantity = $state(1);
	const crafts = $derived(craftsFor(Math.max(1, Number(quantity) || 1), data.recipe?.made));
	const cost = $derived(data.recipe?.reagents ? reagentCost(data.recipe.reagents, crafts, data.prices) : null);
	const when = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' });
	// Un joueur peut avoir plusieurs persos qui connaissent la recette : un seul choix par joueur.
	const players = $derived([...new Map((data.recipe?.artisans ?? []).map((a) => [a.playerId, a])).values()]);
</script>

<svelte:head><title>Nouvelle commande · {cfg.guild.name}</title></svelte:head>

<h1>Nouvelle commande</h1>

{#if !data.recipe}
	<p class="notice warn">
		Personne dans la guilde ne connaît cette recette, ou elle n'a pas encore été exportée. Cherche ce qu'il te faut dans
		<a href="/artisans">Artisans</a>, puis clique sur « Commander ».
	</p>
{:else}
	{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
	<form method="POST" use:enhance={keepValues} class="card form">
		<input type="hidden" name="recipeId" value={data.recipe.id} />
		<h2>
			<a href={recipeUrl(data.recipe.id)} target="_blank" rel="noopener">{data.recipe.name}</a>
			<span class="muted small">{professionName(data.recipe.profession)}</span>
		</h2>
		<div class="grid">
			<div>
				<label for="quantity">Quantité</label>
				<input id="quantity" name="quantity" type="number" min="1" max="200" bind:value={quantity} required />
			</div>
			<div>
				<label for="artisanId">Artisan</label>
				<select id="artisanId" name="artisanId" value={players.some((a) => a.playerId === data.artisan) ? data.artisan : ''}>
					<option value="">N'importe qui ({players.length} {players.length > 1 ? 'artisans la connaissent' : 'artisan la connaît'})</option>
					{#each players as a (a.playerId)}<option value={a.playerId}>{a.name}{a.name === a.player ? '' : ` (${a.player})`}</option>{/each}
				</select>
			</div>
		</div>
		<fieldset>
			<legend>Composants</legend>
			<label class="choice"><input type="radio" name="materials" value="provided" bind:group={materials} /> Je fournis les composants</label>
			<label class="choice"><input type="radio" name="materials" value="missing" bind:group={materials} /> Je ne les ai pas : l'artisan devra les trouver</label>
		</fieldset>
		{#if data.recipe.reagents}
			<div class="reagents">
				<p><strong>Composants{crafts > 1 ? ` pour ${crafts} fabrications` : ''} :</strong> {reagentList(data.recipe.reagents, crafts)}</p>
				{#if cost}
					<p class="muted small">
						≈ <strong>{formatMoney(cost.total)}</strong> à l'hôtel des ventes{cost.missing.length ? `, sans ${cost.missing.join(', ')} (prix inconnu)` : ''}{data.at
							? `, prix de ${when.format(data.at)}`
							: ''}. Une estimation : l'artisan fixe son prix.
					</p>
				{/if}
			</div>
		{/if}
		{#if materials === 'provided'}
			<MoneyInput name="commission" label="Commission offerte (facultatif)" hint="Un petit quelque chose pour l'artisan, en plus des composants." />
		{:else}
			<MoneyInput
				name="budget"
				label="Budget maximum (facultatif)"
				hint="L'artisan propose son prix, composants compris. S'il tient dans ton budget, il prend la commande aussitôt ; sinon, tu acceptes ou tu refuses."
			/>
		{/if}
		<div>
			<label for="comment">Commentaire (facultatif)</label>
			<textarea id="comment" name="comment" maxlength="300" rows="3" placeholder="Pour quand ? Une précision pour l'artisan ?"></textarea>
		</div>
		<p class="hint muted">
			{#if data.announced}La commande sera annoncée dans le salon des commandes sur Discord. {/if}Tu peux avoir {data.max} commandes en cours
			au plus. Une commande que personne ne prend est fermée au bout de 14 jours.
		</p>
		<div class="row">
			<button>Passer la commande</button>
			<a class="button secondary" href="/artisans">Retour</a>
		</div>
	</form>
{/if}

<style>
	h2 {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0;
	}
	h2 a {
		color: var(--text);
	}
	.reagents p {
		margin: 0;
	}
	.reagents {
		display: grid;
		gap: 0.25rem;
	}
	fieldset {
		display: grid;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 0.375rem;
		font-weight: 600;
	}
	.small {
		font-size: 0.875rem;
		font-weight: 400;
	}
</style>
