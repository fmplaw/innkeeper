<script lang="ts">
	import { enhance } from '$app/forms';
	import { professionNames } from '$lib/labels';

	let { data, form } = $props();
	type Report = NonNullable<typeof data.report>;
	const cfg = $derived(data.config);
	const plan = $derived(form && 'plan' in form ? form.plan : null);
	const changes = $derived(plan?.updates.filter((u) => u.level || u.professions || u.recipes) ?? []);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	const dayFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	let sending = $state(false);
	let syncing = $state(false);
	const bnet = $derived(data.battlenet);
	const bnetResult = $derived(form && 'battlenetResult' in form ? form.battlenetResult : null);
	const ranks = $derived(Object.entries(bnet.ranks).sort(([a], [b]) => Number(a) - Number(b)));
	const busy = () => {
		syncing = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			syncing = false;
		};
	};
</script>

<h1>Import du jeu</h1>
<p class="muted intro">
	Deux sources pour mettre les fiches à jour : <strong>Battle.net</strong> (l'Armurerie de Blizzard) donne tout seul
	le registre de la guilde, les niveaux, les métiers et la dernière connexion ; l'addon <strong>InnkeeperSync</strong>
	ajoute les recettes. Le site relie les persos par leur nom complet : le prénom et le nom de famille de la fiche
	doivent être exactement ceux du jeu.
</p>

<section class="card bnet">
	<h2>Battle.net</h2>
	{#if bnet.configured}
		<p>
			Synchronisation automatique <strong>toutes les 3 heures</strong> avec la guilde
			<a href="https://worldofwarcraft.blizzard.com/fr-fr/forever/{bnet.region}/armory/guild/{bnet.guildSlug}" target="_blank" rel="noopener">{bnet.guildSlug}</a>
			({bnet.region.toUpperCase()}). L'Armurerie se met à jour quand un perso se déconnecte du jeu.
		</p>
	{:else}
		<p>
			Avec un client de l'API Battle.net (gratuit), le site lit l'Armurerie de Forever toutes les 3 heures : registre de
			la guilde avec les noms complets, niveaux, métiers et dernière connexion. Personne n'a besoin d'installer quoi
			que ce soit pour ça.
		</p>
	{/if}
	{#if bnetResult}
		<p class="notice" class:ok={bnetResult.ok} class:bad={!bnetResult.ok}>{bnetResult.message}</p>
	{:else if bnet.status}
		<p class:warn={!bnet.status.ok}>
			Dernier passage le {dateFormat.format(bnet.status.at)} : {bnet.status.message}
		</p>
	{/if}
	{#if form && 'battlenetError' in form}<p class="notice bad">{form.battlenetError}</p>{/if}

	{#if bnet.configured}
		<div class="row">
			<form method="POST" action="?/battlenetSync" use:enhance={busy}>
				<button disabled={syncing}>{syncing ? 'Synchronisation… (quelques secondes)' : 'Synchroniser maintenant'}</button>
			</form>
		</div>
	{/if}

	<details open={!bnet.configured}>
		<summary>{bnet.configured ? 'Modifier la connexion' : 'Connecter Battle.net'}</summary>
		{#if !bnet.configured}
			<ol class="small">
				<li>
					Sur <a href="https://develop.battle.net/access/clients" target="_blank" rel="noopener">develop.battle.net</a>,
					connecte-toi avec ton compte Battle.net et clique sur <strong>Create Client</strong>.
				</li>
				<li>Nom : unique au monde (par exemple « Innkeeper - {data.config.guild.name} »). Coche « I do not have a service URL ». Usage : « Guild website ».</li>
				<li>Copie ci-dessous le <strong>Client ID</strong> et le <strong>Client Secret</strong>.</li>
			</ol>
		{/if}
		<form method="POST" action="?/battlenet" class="bnet-form" use:enhance={busy}>
			<label for="bnet-id">Client ID</label>
			<input id="bnet-id" name="clientId" value={bnet.clientId ?? ''} autocomplete="off" spellcheck="false" required />
			<label for="bnet-secret">Client Secret</label>
			<input
				id="bnet-secret"
				name="clientSecret"
				type="password"
				autocomplete="new-password"
				placeholder={bnet.hasSecret ? 'Enregistrée : laisse vide pour la garder' : ''}
				required={!bnet.hasSecret}
			/>
			<label for="bnet-guild">Guilde (comme dans l'adresse de l'Armurerie)</label>
			<input id="bnet-guild" name="guildSlug" value={bnet.guildSlug} spellcheck="false" required />
			<label for="bnet-region">Région</label>
			<select id="bnet-region" name="region" value={bnet.region}>
				<option value="eu">Europe</option>
				<option value="us">Amériques</option>
			</select>
			<div class="row">
				<button disabled={syncing}>{syncing ? 'Essai en cours…' : 'Enregistrer et synchroniser'}</button>
			</div>
		</form>
		{#if bnet.configured}
			<form method="POST" action="?/battlenetOff" use:enhance>
				<button class="secondary">Retirer la connexion</button>
			</form>
		{/if}
	</details>
	<p class="muted small">
		Battle.net ne donne ni les recettes ni le nom des rangs : les recettes viennent de l'addon, et le site retient les
		noms des rangs du dernier registre envoyé par l'addon{ranks.length
			? ` (${ranks.map(([i, n]) => `${i} : ${n}`).join(', ')})`
			: ' (aucun pour l’instant : « Rang 1 », « Rang 2 »… en attendant)'}.
	</p>
</section>

{#snippet lists(notFound: Report['notFound'], withoutSheet: Report['withoutSheet'], afterImport: boolean)}
	{#if notFound.length}
		<section class="card">
			<h2>Fiches du site introuvables dans la guilde en jeu <span class="muted">({notFound.length})</span></h2>
			<p class="muted small">
				Prénom ou nom de famille différent de celui du jeu, perso pas encore dans la guilde, ou ancien perso.{afterImport
					? ' Elles seront marquées « pas trouvé en jeu » après l\'import.'
					: ' Elles sont marquées « pas trouvé en jeu ».'}
			</p>
			<ul class="without">
				{#each notFound as n (n.characterId)}
					<li><a href="/persos/{n.characterId}"><strong>{n.name}</strong></a> <span class="muted">{n.player}</span></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if withoutSheet.length}
		<section class="card">
			<h2>Membres de la guilde sans fiche sur le site <span class="muted">({withoutSheet.length})</span></h2>
			<p class="muted small">Nom en jeu introuvable sur le site : pas de compte, pas de fiche, ou nom différent sur la fiche.</p>
			<ul class="without">
				{#each withoutSheet as m (m.name)}
					<li><strong>{m.name}</strong> <span class="muted">niv. {m.level}{m.class ? ` · ${m.class}` : ''}{m.rank ? ` · ${m.rank}` : ''}</span></li>
				{/each}
			</ul>
		</section>
	{/if}
{/snippet}

{#if data.report && !plan}
	{@const r = data.report}
	<section class="card">
		<h2>Dernière synchronisation</h2>
		<p>
			{dateFormat.format(r.appliedAt)}{r.via === 'battlenet' ? ', par Battle.net' : r.by ? `, par ${r.by}` : ''}
			{r.via === 'sync' ? "avec l'application InnkeeperSync" : r.via === 'manual' ? 'en déposant le fichier' : ''} · {r.rosterSize} membres en jeu
		</p>
		<p>
			<strong>{r.linked}</strong> perso{r.linked > 1 ? 's' : ''} reconnu{r.linked > 1 ? 's' : ''} ·
			<strong>{r.withoutSheet.length}</strong> membre{r.withoutSheet.length > 1 ? 's' : ''} sans fiche ·
			<strong>{r.notFound.length}</strong> fiche{r.notFound.length > 1 ? 's' : ''} introuvable{r.notFound.length > 1 ? 's' : ''}
		</p>
		{#if r.ambiguous.length}
			<p class="warn">Impossible de savoir quelle fiche correspond à ces persos (même nom, ou fiche sans nom de famille) : {r.ambiguous.join(', ')}.</p>
		{/if}
		<p class="muted small">Comparé aux fiches d'aujourd'hui : une fiche corrigée sort de ces listes tout de suite.</p>
	</section>
	{@render lists(r.notFound, r.withoutSheet, false)}
{/if}

<section class="card steps">
	<h2>Comment faire</h2>
	<p>
		<strong>Le plus simple :</strong> Battle.net, ci-dessus. Pour les <strong>recettes</strong>, chacun installe l'addon
		et l'application <strong>InnkeeperSync</strong> (Mes persos → Synchronisation automatique) : elles arrivent alors
		toutes seules à chaque déconnexion du jeu.
	</p>
	<p>Sans l'application, l'addon permet aussi de déposer le fichier à la main :</p>
	<ol>
		<li>
			Installer l'addon <strong>Innkeeper Sync</strong> : dans l'application CurseForge ou Wago (version de jeu
			World of Warcraft: Forever), ou <a href="/addon/InnkeeperSync.zip" download>en zip</a> à décompresser dans le
			dossier <code>Interface/AddOns</code> du jeu.
		</li>
		<li>En jeu, avec un perso de la guilde : tape <code>/innkeeper</code> (ou <code>/ik</code>), puis <code>/reload</code> pour que le jeu écrive le fichier.</li>
		<li>Pour exporter aussi tes recettes : ouvre la fenêtre de chacun de tes métiers avant le <code>/reload</code>.</li>
		<li>
			Dépose ci-dessous le fichier <code>WTF/Account/&lt;TON COMPTE&gt;/SavedVariables/InnkeeperSync.lua</code>
			(dans le dossier du jeu).
		</li>
	</ol>
	<p class="muted small">
		L'addon n'envoie rien sur Internet : il écrit seulement ce fichier. Un officier suffit pour toute la guilde ;
		refais-le de temps en temps (une fois par semaine par exemple).
	</p>
</section>

{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
{#if form?.applied !== undefined && form?.synced !== undefined}
	{@const n = form.applied}
	{@const synced = form.synced}
	<p class="notice ok">
		Import terminé : {n} fiche{n > 1 ? 's' : ''} mise{n > 1 ? 's' : ''} à jour, {synced} perso{synced > 1 ? 's' : ''}
		synchronisé{synced > 1 ? 's' : ''} (dernière connexion).
	</p>
{/if}

<form
	method="POST"
	action="?/preview"
	enctype="multipart/form-data"
	class="card upload"
	use:enhance={() => {
		sending = true;
		return async ({ update }) => {
			await update();
			sending = false;
		};
	}}
>
	<label for="file">Fichier InnkeeperSync.lua</label>
	<div class="row">
		<input id="file" name="file" type="file" accept=".lua" required />
		<button disabled={sending}>{sending ? 'Lecture…' : 'Voir les changements'}</button>
	</div>
</form>

{#if plan && form && 'token' in form}
	<section class="card preview">
		<h2>Aperçu</h2>
		<p>
			Export du {dateFormat.format(plan.exportedAt)}{plan.guild ? ` · ${plan.guild}` : ''} · {plan.rosterSize} membres en jeu
		</p>
		<p>
			<strong>{changes.length}</strong> fiche{changes.length > 1 ? 's' : ''} à mettre à jour ·
			<strong>{plan.updates.length}</strong> perso{plan.updates.length > 1 ? 's' : ''} reconnu{plan.updates.length > 1 ? 's' : ''} ·
			<strong>{plan.withoutSheet.length}</strong> membre{plan.withoutSheet.length > 1 ? 's' : ''} sans fiche
		</p>

		{#if changes.length}
			<div class="table-wrap">
				<table>
					<thead><tr><th>Perso</th><th>Niveau</th><th>Métiers</th><th>Recettes</th></tr></thead>
					<tbody>
						{#each changes as u (u.characterId)}
							<tr>
								<td><strong>{u.name}</strong><br /><span class="muted small">{u.player}</span></td>
								<td>{#if u.level}{u.level.from} → <strong>{u.level.to}</strong>{:else}<span class="muted">—</span>{/if}</td>
								<td>
									{#if u.professions}
										<span class="muted">{professionNames(cfg, u.professions.from) || 'aucun'}</span><br />→ {professionNames(cfg, u.professions.to)}
									{:else}<span class="muted">—</span>{/if}
								</td>
								<td>{#if u.recipes}{u.recipes.reduce((n, r) => n + r.recipes.length, 0)} recettes{:else}<span class="muted">—</span>{/if}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="muted">Aucune fiche à modifier : les niveaux et métiers sont déjà à jour.</p>
		{/if}

		{#if plan.ambiguous.length}
			<p class="warn">Impossible de savoir quelle fiche correspond à ces persos (même nom, ou fiche sans nom de famille), elles ne sont pas mises à jour : {plan.ambiguous.join(', ')}.</p>
		{/if}
		{#if plan.outdated.length}
			<p class="warn">Ces fiches ont déjà des données d'un export plus récent, elles ne sont pas remplacées : {plan.outdated.join(', ')}.</p>
		{/if}

		<form method="POST" action="?/apply" use:enhance class="row">
			<input type="hidden" name="token" value={form.token} />
			<button>Appliquer l'import</button>
			<span class="muted small">La dernière connexion en jeu des {plan.updates.length} persos reconnus est aussi enregistrée.</span>
		</form>
	</section>

	{@render lists(plan.notFound, plan.withoutSheet, true)}
{/if}

<style>
	.intro {
		max-width: 70ch;
	}
	section,
	.upload {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	section p {
		margin: 0;
	}
	.steps ol {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.35rem;
	}
	code {
		background: var(--surface-2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		word-break: break-all;
	}
	.small {
		font-size: 0.85rem;
	}
	.upload input[type='file'] {
		flex: 1;
		min-width: 0;
	}
	.without {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 0.3rem 1rem;
	}
	.warn {
		color: var(--gold);
	}
	.bnet details {
		display: grid;
		gap: 0.6rem;
	}
	.bnet summary {
		cursor: pointer;
		font-weight: 600;
	}
	.bnet ol {
		margin: 0.5rem 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.3rem;
	}
	.bnet-form {
		display: grid;
		gap: 0.35rem;
		max-width: 32rem;
		margin: 0.5rem 0;
	}
	.bnet-form .row {
		margin-top: 0.4rem;
	}
	.ok {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
</style>
