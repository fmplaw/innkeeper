<script lang="ts">
	let { data } = $props();
	const guild = $derived(data.config.guild?.name ?? 'la guilde');
</script>

<svelte:head><title>Confidentialité · {guild}</title></svelte:head>

<article class="card privacy">
	<h1>Confidentialité</h1>
	<p class="lead">
		Ce site est l'outil de {guild}, une guilde de World of Warcraft Forever. Il est géré bénévolement par des membres
		de la guilde, sans publicité ni pistage{data.config.wowheadTooltips ? ' (voir « Bulles Wowhead » plus bas)' : ''}. Il n'est lié ni à Blizzard, ni à Discord.
	</p>

	<h2>Connexion avec Discord</h2>
	<ul>
		<li>
			Tu te connectes <strong>sur discord.com</strong>, la page officielle de Discord : le site ne voit
			<strong>jamais ton mot de passe</strong> et ne te le demandera jamais.
		</li>
		<li>
			Discord nous transmet seulement ton identifiant, ton pseudo et ton avatar, ainsi que tes rôles sur le serveur de
			la guilde, pour savoir si tu es membre ou officier. Il nous dit aussi si ton compte Battle.net est relié à ton compte
			Discord, avec ton BattleTag (visible des officiers seulement) : Blizzard ne relaie le chat de guilde sur Discord que pour
			les comptes reliés, et les officiers peuvent ainsi rappeler à chacun de le faire.
		</li>
		<li>
			Si ta candidature est acceptée et que tu choisis « Rejoindre le serveur », Discord te demande en plus
			l'autorisation de t'y ajouter. Elle ne sert qu'une fois, pour cette entrée.
		</li>
		<li>Tu peux retirer l'accès à tout moment dans Discord : Paramètres → Applications autorisées.</li>
	</ul>

	<h2>Ce que le site conserve</h2>
	<ul>
		<li>Les fiches de tes personnages et ce que tu y écris (niveau, spécialisations, métiers, intérêts, notes).</li>
		<li>Ta candidature, si tu en déposes une, et l'avis des officiers.</li>
		<li>
			Les données venues du jeu : niveau, métiers, dernière connexion en jeu et recettes. Elles viennent de l'addon de
			la guilde, et de l'Armurerie publique de Blizzard (API Battle.net) si la guilde l'a connectée.
		</li>
		<li>Un journal des actions des officiers, gardé 1 an, consulté seulement en cas de litige.</li>
	</ul>
	<p>
		Les données restent sur le serveur de la guilde, avec des sauvegardes gardées 60 jours au plus. Elles ne sont ni
		vendues ni partagées. Seule exception, sans rien sur toi : pour afficher en français les recettes exportées d'un jeu
		en anglais, le serveur demande leur nom à Wowhead, en n'envoyant que le numéro de la recette.
	</p>

	{#if data.config.wowheadTooltips}
		<h2>Bulles Wowhead</h2>
		<p>
			Pour afficher la fiche d'une recette au survol, le site charge un script de <strong>Wowhead</strong>, la base de
			données du jeu. Ton navigateur contacte alors les serveurs de Wowhead, qui reçoivent ton adresse IP et la page
			consultée, selon leur propre politique de confidentialité.
		</p>
	{/if}

	<h2>Cookies</h2>
	<p>
		Seulement ceux nécessaires à la connexion (ta session). Aucun cookie de mesure d'audience, de publicité ou de réseau
		social.
	</p>

	<h2>Tes données</h2>
	<p>
		Pour consulter, corriger ou supprimer tes données, contacte un officier de la guilde sur Discord. Tes fiches de
		personnage se modifient et se suppriment directement depuis « Mes persos ».
	</p>
</article>

<style>
	.privacy {
		max-width: 46rem;
		margin: 0 auto;
		display: grid;
		gap: 0.6rem;
	}
	.privacy h1 {
		margin: 0 0 0.25rem;
	}
	.privacy h2 {
		margin: 0.9rem 0 0;
		font-size: 1.1rem;
		color: var(--gold);
	}
	.privacy p,
	.privacy ul {
		margin: 0;
	}
	.privacy ul {
		padding-left: 1.2rem;
		display: grid;
		gap: 0.35rem;
	}
	.lead {
		font-size: 1.02rem;
	}
</style>
