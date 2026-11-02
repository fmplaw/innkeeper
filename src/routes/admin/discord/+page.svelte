<script lang="ts">
	import DiscordForm from '$lib/components/DiscordForm.svelte';

	let { data, form } = $props();
	const bot = $derived(data.bot);
</script>

<h1>Connexion Discord</h1>
{#if form?.saved}
	<p class="notice ok">
		Identifiants vérifiés et enregistrés.
		{#if form.synced !== null && form.synced !== undefined}{form.synced} rôles récupérés depuis le bot.{/if}
	</p>
{/if}
{#if !data.values.clientId && !form}
	<p class="notice warn">Discord n'est pas encore configuré : les joueurs ne peuvent pas se connecter.</p>
{/if}

{#if bot}
	<section class="card bot">
		<div class="head">
			<h2>Bot de la guilde</h2>
			{#if bot.guildName}
				<span class="status on">Présent sur « {bot.guildName} »</span>
			{:else if bot.configured}
				<span class="status off">Jeton enregistré, mais le bot n'est pas sur le serveur</span>
			{:else}
				<span class="status off">Non configuré</span>
			{/if}
		</div>
		<p class="muted">
			Le bot récupère les vrais noms des rôles, fait entrer les recrues acceptées, annonce les candidatures aux
			officiers et repère les sorties Raid-Helper dans les salons (il ne lit que l'identifiant des messages, jamais leur
			contenu). Il ne modère rien.
		</p>
		<ol>
			<li>
				Dans le <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">portail développeur</a>,
				ouvre l'application du site, onglet <strong>Bot</strong> : <strong>Reset Token</strong>, copie le jeton et colle-le
				plus bas dans « Token du bot », puis enregistre. Dans le même onglet, donne-lui un <strong>nom d'utilisateur</strong>
				bien à lui (« Aubergiste », un nom qui fait sourire la guilde…) : c'est celui qu'on voit dans la liste des membres.
			</li>
			<li>
				<a class="button secondary" href={bot.inviteUrl} target="_blank" rel="noopener">Inviter le bot sur le serveur</a>
				<span class="muted small">Il faut la permission « Gérer le serveur » sur Discord.</span>
			</li>
			<li>
				Sur Discord, dans Paramètres du serveur → Rôles, place le rôle du bot <strong>juste au-dessus du rôle des nouvelles
				recrues</strong> : il ne pourra attribuer que les rôles situés en dessous du sien. Ce rôle prend le nom de
				l'application au moment de l'invitation : renomme-le comme le bot pour ne pas le confondre avec un rang de la guilde.
			</li>
			<li>
				<strong>Salons privés</strong> (salon des officiers, salons de sorties…) : ajoute le rôle du bot aux permissions du
				salon (voir le salon, lire l'historique, et écrire là où il fait des annonces). Attention, un refus posé sur
				<code>@everyone</code> s'applique aussi aux bots s'ils ne sont pas autorisés explicitement.
			</li>
			<li>Recharge cette page : le statut doit indiquer que le bot est présent, et les rôles apparaissent dans « Rôles Discord ».</li>
		</ol>
	</section>
{/if}

<DiscordForm values={form?.values ?? data.values} errors={form?.errors} redirectUrl={data.redirectUrl} guildName={data.guildName} submitLabel="Vérifier et enregistrer" />

<style>
	.ok,
	.warn {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.warn {
		color: var(--gold);
	}
	.bot {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.bot p {
		margin: 0;
	}
	ol {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.6rem;
	}
	.status {
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 600;
		background: var(--surface-2);
		color: var(--muted);
	}
	.status.on {
		background: color-mix(in srgb, var(--good) 20%, transparent);
		color: var(--good);
	}
	.small {
		font-size: 0.85rem;
		margin-left: 0.5rem;
	}
</style>
