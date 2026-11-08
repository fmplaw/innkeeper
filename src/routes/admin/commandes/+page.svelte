<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();
</script>

<h1>Commandes de craft</h1>
<p class="muted intro">
	Les membres commandent une recette depuis la page <a href="/artisans">Artisans</a> et suivent leurs commandes dans
	<a href="/commandes">Commandes</a>. Le bot annonce chaque commande dans le salon choisi, puis met son message à jour quand elle est prise,
	livrée ou annulée.
</p>

{#if form?.saved}<p class="notice ok">Réglages enregistrés.</p>{/if}
{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
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
	<div class="row"><button>Enregistrer</button></div>
</form>

<style>
	.intro {
		max-width: 75ch;
	}
</style>
