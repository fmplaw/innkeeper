<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();

	const VISIBILITY = { members: 'Visible par les membres', officers: 'Réservé aux officiers' } as const;
</script>

<h1>Rosters</h1>
<p class="muted intro">
	Un roster est une équipe composée par les officiers : roster raid principal, rerolls, équipe PvP… Les persos
	s'ajoutent depuis la page <a href="/roster">Roster</a>, onglet du roster concerné. Un perso peut faire partie de
	plusieurs rosters, et « Toute la guilde » reste toujours disponible.
</p>

{#if form?.error}<p class="card error">{form.error}</p>{/if}
{#if form?.created}<p class="card ok">Roster créé.</p>{/if}
{#if form?.saved}<p class="card ok">Roster enregistré.</p>{/if}
{#if form?.deleted}<p class="card ok">Roster supprimé.</p>{/if}

<div class="list">
	{#each data.rosters as r (r.id)}
		<form method="POST" action="?/update" use:enhance={keepValues} class="card roster">
			<input type="hidden" name="id" value={r.id} />
			<div class="fields">
				<div>
					<label for="name-{r.id}">Nom</label>
					<input id="name-{r.id}" name="name" required minlength="2" maxlength="60" value={r.name} />
				</div>
				<div>
					<label for="visibility-{r.id}">Visibilité</label>
					<select id="visibility-{r.id}" name="visibility" value={r.visibility}>
						{#each Object.entries(VISIBILITY) as [value, label] (value)}<option {value}>{label}</option>{/each}
					</select>
				</div>
				<div class="wide">
					<label for="description-{r.id}">Description</label>
					<input id="description-{r.id}" name="description" maxlength="300" value={r.description ?? ''} />
				</div>
			</div>
			<div class="row actions">
				<a href="/roster?equipe={r.id}">{r.size} perso{r.size > 1 ? 's' : ''} · voir</a>
				<span class="spacer"></span>
				<button class="secondary">Enregistrer</button>
				<button
					class="danger"
					formaction="?/delete"
					onclick={(e) => {
						if (!window.confirm(`Supprimer le roster « ${r.name} » ? Les persos restent dans la guilde.`)) e.preventDefault();
					}}>Supprimer</button
				>
			</div>
		</form>
	{:else}
		<p class="muted">Aucun roster pour l'instant.</p>
	{/each}
</div>

<form method="POST" action="?/create" use:enhance class="card roster new">
	<h2>Nouveau roster</h2>
	<div class="fields">
		<div>
			<label for="new-name">Nom</label>
			<input id="new-name" name="name" required minlength="2" maxlength="60" placeholder="Roster raid principal" />
		</div>
		<div>
			<label for="new-visibility">Visibilité</label>
			<select id="new-visibility" name="visibility">
				{#each Object.entries(VISIBILITY) as [value, label] (value)}<option {value}>{label}</option>{/each}
			</select>
		</div>
		<div class="wide">
			<label for="new-description">Description</label>
			<input id="new-description" name="description" maxlength="300" placeholder="Équipe du mercredi et du dimanche" />
		</div>
	</div>
	<div class="row"><button>Créer le roster</button></div>
</form>

<style>
	.intro {
		max-width: 65ch;
	}
	.list {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.roster {
		display: grid;
		gap: 0.75rem;
	}
	.new h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.75rem 1rem;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.actions {
		align-items: center;
	}
	.spacer {
		flex: 1;
	}
	.ok {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	p.card.error {
		margin-bottom: 1rem;
	}
</style>
