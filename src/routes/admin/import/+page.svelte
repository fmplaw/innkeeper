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
</script>

<h1>Import du jeu</h1>
<p class="muted intro">
	L'addon <strong>InnkeeperSync</strong> exporte depuis le jeu le registre de guilde (niveaux, dernière connexion),
	les métiers de tous les membres et les recettes de ton perso. Le site relie les persos par leur nom complet : le
	prénom et le nom de famille de la fiche doivent être exactement ceux du jeu.
</p>

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
			{dateFormat.format(r.appliedAt)}{r.by ? `, par ${r.by}` : ''}
			{r.via === 'sync' ? "avec l'application InnkeeperSync" : 'en déposant le fichier'} · {r.rosterSize} membres en jeu
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
		<strong>Le plus simple :</strong> un officier installe l'addon et l'application <strong>InnkeeperSync</strong>
		(Mes persos → Synchronisation automatique). Le registre de la guilde arrive alors tout seul à chaque déconnexion du
		jeu, et s'affiche ci-dessus.
	</p>
	<p>Sans l'application, dépose le fichier à la main :</p>
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
	.ok {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
</style>
