<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();

	const PERMISSION_LABELS = { officer: 'Officier', member: 'Membre', none: 'Aucune' } as const;
</script>

<h1>Rôles Discord</h1>

{#if form?.saved}<p class="notice ok">Réglages enregistrés.</p>{/if}
{#if form?.synced !== undefined}<p class="notice ok">{form.synced} rôles synchronisés depuis le bot.</p>{/if}
{#if form?.error}<p class="notice bad">{form.error}</p>{/if}

{#if !data.discordReady}
	<p class="notice warn">Discord n'est pas encore configuré : aucun rôle ne peut être découvert pour l'instant.</p>
{/if}

<form method="POST" action="?/save" use:enhance={keepValues} class="card form">
	<fieldset>
		<legend>Qui peut accéder au site ?</legend>
		<label class="choice">
			<input type="radio" name="access" value="all-members" checked={data.access.mode === 'all-members'} />
			Tout membre du serveur Discord (les rôles ci-dessous ne servent qu'à désigner les officiers)
		</label>
		<label class="choice">
			<input type="radio" name="access" value="mapped-roles" checked={data.access.mode === 'mapped-roles'} />
			Seulement les membres ayant un rôle « Membre » ou « Officier »
		</label>
	</fieldset>

	<div class="head">
		<p class="muted">
			Les rôles apparaissent ici quand un membre qui les porte se connecte au site.
			{#if data.hasBot}Le bot peut aussi récupérer tous les rôles du serveur avec leur vrai nom.{:else}Sans bot,
				donne-leur un nom pour t'y retrouver (Discord ne transmet que leur identifiant).{/if}
		</p>
		{#if data.hasBot}
			<button class="secondary" formaction="?/sync" formnovalidate>Synchroniser depuis le bot</button>
		{/if}
	</div>

	{#if data.roles.length === 0}
		<p class="muted">Aucun rôle connu pour l'instant : connecte-toi avec Discord pour découvrir les tiens.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr><th>Rôle</th><th>Nom affiché</th><th>Joueurs du site</th><th>Permission</th></tr>
				</thead>
				<tbody>
					{#each data.roles as r (r.id)}
						<tr>
							<td>
								{#if r.name}<strong>{r.name}</strong><br />{/if}
								<span class="muted mono">{r.id}</span>
								<input type="hidden" name="roleId" value={r.id} />
							</td>
							<td><input name="label-{r.id}" value={r.label ?? ''} placeholder={r.name ?? 'Nom du rôle'} maxlength="60" /></td>
							<td>{r.members}</td>
							<td>
								<select name="permission-{r.id}" value={r.permission}>
									{#each Object.entries(PERMISSION_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}
								</select>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<div class="row"><button>Enregistrer</button></div>
</form>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	fieldset {
		border: 1px solid var(--border);
		border-radius: 6px;
		display: grid;
		gap: 0.5rem;
	}
	legend {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.choice {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		color: var(--text);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		justify-content: space-between;
	}
	.head p {
		margin: 0;
		flex: 1;
		min-width: 16rem;
	}
	.mono {
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
	}
	td input,
	td select {
		min-width: 9rem;
	}
	.ok,
	.warn {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.warn {
		color: var(--gold);
	}
</style>
