<script lang="ts">
	import { enhance } from '$app/forms';
	import { SOURCE_URL } from '$lib/project';

	let { data, form } = $props();
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	const DOWNLOAD = `${SOURCE_URL}/releases/latest/download/InnkeeperSync-Setup.exe`;
	let copied = $state(false);

	// Clé créée par « Connecter InnkeeperSync » : on l'envoie à l'application par son lien.
	$effect(() => {
		if (form?.link) window.location.href = form.link;
	});

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

<p><a href="/persos" class="muted">← Mes persos</a></p>
<h1>Synchronisation automatique</h1>
<p class="muted lead">
	L'application <strong>InnkeeperSync</strong>, installée sur ton PC, envoie au site les données de l'addon chaque fois
	que le jeu les enregistre (à la déconnexion ou après un <code>/reload</code>). Elle se lance avec Windows et reste
	discrètement près de l'horloge.
</p>

<section class="card scope">
	{#if data.officer}
		<p>
			<strong>En tant qu'officier</strong>, ta synchronisation met à jour toute la guilde (niveaux, métiers et dernière
			connexion de chaque membre) avec le registre de guilde exporté par l'addon.
		</p>
	{:else}
		<p>Ta synchronisation met à jour <strong>tes</strong> persos : niveau, métiers et recettes.</p>
	{/if}
</section>

<section class="card steps">
	<h2>Mise en route</h2>
	<ol>
		<li>
			Installe l'addon <strong>Innkeeper Sync</strong> dans le jeu, si ce n'est pas déjà fait : dans l'application
			CurseForge ou Wago (version de jeu World of Warcraft: Forever), ou <a href="/addon/InnkeeperSync.zip">en zip</a>.
		</li>
		<li>
			<a href={DOWNLOAD}>Télécharge InnkeeperSync pour Windows</a> et lance l'installation. Si Windows affiche un
			avertissement : « Informations complémentaires », puis « Exécuter quand même ».
			<span class="muted small">(Linux : <a href="{SOURCE_URL}/releases/latest" rel="noopener">version AppImage</a>.)</span>
		</li>
		<li>
			Clique sur le bouton ci-dessous : l'application s'ouvre et te demande de confirmer.
			<form method="POST" action="?/connect" use:enhance class="connect">
				<button disabled={data.tokens.length >= data.maxTokens}>Connecter InnkeeperSync</button>
			</form>
		</li>
		<li>En jeu, tape <code>/innkeeper</code> de temps en temps (ouvre aussi tes fenêtres de métier pour les recettes). L'application envoie le reste.</li>
	</ol>
</section>

{#if form?.token}
	<section class="card new-token">
		{#if form.link}
			<h2>InnkeeperSync devrait s'ouvrir</h2>
			<p class="muted">Rien ne s'ouvre ? Installe d'abord l'application, ou colle cette clé dans « J'ai une clé à coller » :</p>
		{:else}
			<h2>Ta nouvelle clé</h2>
			<p class="muted">Copie-la maintenant dans l'application : elle ne sera plus jamais affichée.</p>
		{/if}
		<div class="row">
			<code class="token">{form.token}</code>
			<button type="button" class="secondary" onclick={() => copy(form.token)}>{copied ? 'Copiée ✔' : 'Copier'}</button>
		</div>
	</section>
{/if}

<section class="card">
	<h2>Mes clés</h2>
	{#if data.tokens.length}
		<ul class="tokens">
			{#each data.tokens as t (t.id)}
				<li>
					<div>
						<strong>{t.label}</strong>
						<span class="muted small">{t.hint}… · créée le {dateFormat.format(t.createdAt)}</span>
						<span class="muted small">{t.lastUsedAt ? `dernier envoi le ${dateFormat.format(t.lastUsedAt)}` : 'jamais utilisée'}</span>
					</div>
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="id" value={t.id} />
						<input type="hidden" name="label" value={t.label} />
						<button class="danger small-btn">Révoquer</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Aucune clé pour l'instant.</p>
	{/if}
	{#if data.tokens.length < data.maxTokens}
		<details>
			<summary>Créer une clé à coller à la main</summary>
			<form method="POST" action="?/create" use:enhance class="row create">
				<label for="label" class="sr">Nom de la clé</label>
				<input id="label" name="label" maxlength="40" placeholder="Nom de l'ordinateur (ex. PC du salon)" />
				<button class="secondary">Créer une clé</button>
			</form>
		</details>
	{:else}
		<p class="muted small">{data.maxTokens} clés au plus : révoque celles qui ne servent plus pour en créer une autre.</p>
	{/if}
	{#if form?.error}<p class="error">{form.error}</p>{/if}
</section>

<style>
	h1 {
		margin: 0 0 0.5rem;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
		color: var(--gold);
	}
	.lead {
		max-width: 65ch;
		margin: 0 0 1.25rem;
	}
	section {
		margin-bottom: 1.25rem;
		max-width: 52rem;
	}
	.scope p {
		margin: 0;
	}
	ol {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.4rem;
	}
	code {
		background: var(--surface-2);
		padding: 0.05rem 0.35rem;
		border-radius: 4px;
	}
	.new-token {
		border-color: color-mix(in srgb, var(--good) 50%, var(--border));
	}
	.new-token p {
		margin: 0 0 0.6rem;
	}
	.token {
		font-size: 0.95rem;
		padding: 0.4rem 0.6rem;
		word-break: break-all;
		user-select: all;
	}
	.tokens {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.tokens li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem 1rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--border);
	}
	.tokens li div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.75rem;
		align-items: baseline;
	}
	.small {
		font-size: 0.85rem;
	}
	.small-btn {
		padding: 0.25rem 0.7rem;
		font-size: 0.85rem;
	}
	.connect {
		margin: 0.5rem 0 0.25rem;
	}
	details summary {
		cursor: pointer;
		color: var(--muted);
		font-size: 0.9rem;
	}
	details[open] summary {
		margin-bottom: 0.6rem;
	}
	.create input {
		flex: 1;
		min-width: 14rem;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
