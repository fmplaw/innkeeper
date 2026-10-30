<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		values = {},
		errors = {},
		redirectUrl,
		submitLabel,
		skippable = false,
		guildName = null
	}: {
		values?: { clientId?: string; guildId?: string; hasSecret?: boolean; hasBot?: boolean };
		errors?: Record<string, string>;
		redirectUrl: string;
		submitLabel: string;
		skippable?: boolean;
		/** Nom de la guilde s'il est déjà connu, pour proposer le nom de l'application. */
		guildName?: string | null;
	} = $props();

	// Nom conseillé : celui du site de la guilde, pas de la guilde elle-même (32 caractères au plus).
	const suggestedName = $derived(guildName ? `Portail ${ofName(guildName)}`.slice(0, 32) : 'Portail de <ta guilde>');

	/** « de » contracté devant l'article du nom : du Phénix, des Allys, de la Horde, de l'Aube. */
	function ofName(name: string): string {
		const m = /^(?:(le|la|les)\s+|l['’]\s*)(.+)$/i.exec(name.trim());
		if (!m) return `de ${name}`;
		const article = m[1]?.toLowerCase();
		if (!article) return `de l'${m[2]}`;
		return `${article === 'le' ? 'du' : article === 'les' ? 'des' : 'de la'} ${m[2]}`;
	}

	let submitting = $state(false);
</script>

<form
	method="POST"
	action="?/save"
	class="card form"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			// Pas de remise à zéro : les identifiants affichés restent ceux enregistrés.
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<ol class="steps muted">
		<li>
			Crée une application sur
			<a href="https://discord.com/developers/applications" target="_blank" rel="noopener">le portail développeur Discord</a>,
			puis renseigne son onglet <strong>Informations générales</strong> :
			<ul class="naming">
				<li>
					<strong>Nom</strong> : par exemple <code>{suggestedName}</code>. C'est ce que les joueurs lisent à la connexion
					(« … veut accéder à ton compte ») : nomme <em>le site</em>, pas seulement la guilde, sinon on croit autoriser
					la guilde et le rôle du bot portera le nom de la guilde au milieu de vos rangs.
				</li>
				<li><strong>Icône</strong> : le logo de la guilde, affiché sur l'écran d'autorisation.</li>
				<li><strong>Description</strong> : une phrase et l'adresse du site, visibles sur le profil du bot.</li>
			</ul>
		</li>
		<li>
			Dans <strong>OAuth2 → Redirects</strong>, ajoute exactement ces deux adresses : <code>{redirectUrl}</code> (connexion)
			et <code>{new URL(redirectUrl).origin}/candidature/rejoindre</code> (entrée des recrues sur le serveur).
		</li>
		<li>Copie ici l'identifiant du client et la clé secrète (OAuth2).</li>
		<li>
			ID du serveur : dans Discord, active le mode développeur (Paramètres → Avancés), puis clic droit sur le
			serveur → Copier l'identifiant du serveur.
		</li>
	</ol>

	{#if errors.form}<p class="error">{errors.form}</p>{/if}

	<div class="grid">
		<div>
			<label for="clientId">Identifiant du client *</label>
			<input id="clientId" name="clientId" required inputmode="numeric" value={values.clientId ?? ''} />
			{#if errors.clientId}<p class="error">{errors.clientId}</p>{/if}
		</div>
		<div>
			<label for="clientSecret">Clé secrète du client {values.hasSecret ? '' : '*'}</label>
			<input
				id="clientSecret"
				name="clientSecret"
				type="password"
				autocomplete="off"
				required={!values.hasSecret}
				placeholder={values.hasSecret ? 'Inchangée (laisser vide)' : ''}
			/>
			{#if errors.clientSecret}<p class="error">{errors.clientSecret}</p>{/if}
		</div>
		<div>
			<label for="guildId">ID du serveur Discord *</label>
			<input id="guildId" name="guildId" required inputmode="numeric" value={values.guildId ?? ''} />
			{#if errors.guildId}<p class="error">{errors.guildId}</p>{/if}
		</div>
	</div>

	<details open={values.hasBot || Boolean(errors.botToken)}>
		<summary>Bot de la guilde (nécessaire au recrutement et aux sorties)</summary>
		<p class="muted small">
			Le bot synchronise les vrais noms des rôles, fait entrer les recrues acceptées sur le serveur, annonce les
			candidatures aux officiers et repère les sorties Raid-Helper. Crée-le dans l'onglet Bot du portail développeur,
			colle son token ici, puis invite-le depuis Admin → Connexion Discord (lien fourni, avec les permissions
			nécessaires). Il faut être administrateur du serveur Discord pour l'inviter.
		</p>
		<label for="botToken">Token du bot</label>
		<input
			id="botToken"
			name="botToken"
			type="password"
			autocomplete="off"
			placeholder={values.hasBot ? 'Inchangé (laisser vide)' : ''}
		/>
		{#if errors.botToken}<p class="error">{errors.botToken}</p>{/if}
		{#if values.hasBot}
			<label class="choice"><input type="checkbox" name="removeBot" /> Retirer le bot</label>
		{/if}
	</details>

	<div class="row">
		<button disabled={submitting}>{submitting ? 'Vérification auprès de Discord…' : submitLabel}</button>
		{#if skippable}
			<button class="secondary" formaction="?/skip" formnovalidate>Configurer plus tard</button>
		{/if}
	</div>
</form>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	.naming {
		margin: 0.35rem 0 0;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.25rem;
	}
	.steps {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.35rem;
		font-size: 0.92rem;
	}
	code {
		background: var(--surface-2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		color: var(--text);
		word-break: break-all;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 1rem;
	}
	details {
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.75rem;
		display: grid;
		gap: 0.5rem;
	}
	summary {
		cursor: pointer;
	}
	.small {
		font-size: 0.85rem;
	}
	.choice {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text);
	}
</style>
