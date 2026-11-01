<script lang="ts">
	import { enhance } from '$app/forms';
	import { ADDON_IMPORTANCES, IMPORTANCE_INFO, USAGE_LABELS } from '$lib/addons';
	import AddonFields from '$lib/components/AddonFields.svelte';
	import ImportanceBadge from '$lib/components/ImportanceBadge.svelte';

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const groups = $derived(ADDON_IMPORTANCES.map((i) => ({ importance: i, addons: data.addons.filter((a) => a.importance === i) })).filter((g) => g.addons.length));
</script>

<h1>Addons</h1>
<p class="muted intro">
	Les addons que la guilde conseille, publiés sur la page <a href="/addons">Addons</a> (visible de tous). Peu
	d'indispensables, une phrase sur ce que fait chacun et pourquoi : un nouveau membre doit voir l'essentiel d'un coup
	d'œil.
</p>

{#if form?.saved}<p class="card ok">{form.saved}</p>{/if}
{#if form?.error}<p class="card error">{form.error}</p>{/if}

{#if !data.hasInnkeeperSync}
	<form method="POST" action="?/innkeeperSync" use:enhance class="card suggest row">
		<span><strong>Innkeeper Sync</strong>, l'addon du site, n'est pas encore dans la liste.</span>
		<button class="secondary">L'ajouter en indispensable</button>
	</form>
{/if}

{#each groups as g (g.importance)}
	<section class="group">
		<h2><ImportanceBadge importance={g.importance} /> <span class="muted small">{IMPORTANCE_INFO[g.importance].hint}</span></h2>
		{#each g.addons as a, i (a.id)}
			<details class="card addon" open={form?.form === a.id}>
				<summary>
					<strong>{a.name}</strong>
					<span class="muted small">{USAGE_LABELS[a.usage]}</span>
					<span class="spacer"></span>
					<form method="POST" action="?/move" use:enhance class="moves">
						<input type="hidden" name="id" value={a.id} />
						<button class="secondary icon" name="direction" value="up" disabled={i === 0} title="Monter" aria-label="Monter {a.name}">▲</button>
						<button class="secondary icon" name="direction" value="down" disabled={i === g.addons.length - 1} title="Descendre" aria-label="Descendre {a.name}">▼</button>
					</form>
					<span class="edit muted small">Modifier</span>
				</summary>
				<form method="POST" action="?/update" use:enhance class="edit-form">
					<input type="hidden" name="id" value={a.id} />
					<AddonFields id="addon-{a.id}" values={a} config={cfg} />
					<div class="row">
						<button>Enregistrer</button>
						<button
							class="danger"
							formaction="?/delete"
							onclick={(e) => {
								if (!window.confirm(`Retirer « ${a.name} » de la liste ?`)) e.preventDefault();
							}}>Retirer</button
						>
					</div>
				</form>
			</details>
		{/each}
	</section>
{:else}
	<p class="muted">Aucun addon pour l'instant : la page Addons n'apparaît pas dans le menu tant que la liste est vide.</p>
{/each}

<details class="card new" open={form?.form === 'new' || !data.addons.length}>
	<summary><strong>Ajouter un addon</strong></summary>
	<form method="POST" action="?/create" use:enhance class="edit-form">
		<AddonFields id="new" config={cfg} />
		<div class="row"><button>Ajouter</button></div>
	</form>
</details>

<style>
	h1 {
		margin: 0 0 0.25rem;
	}
	.intro {
		max-width: 65ch;
		margin: 0 0 1.25rem;
	}
	.ok,
	p.card.error,
	.suggest {
		margin: 0 0 1rem;
	}
	.ok {
		border-color: var(--gold);
	}
	.suggest {
		justify-content: space-between;
	}
	.group {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.group h2 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.small {
		font-size: 0.85rem;
		font-weight: 400;
	}
	.addon {
		padding: 0.6rem 0.9rem;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.spacer {
		flex: 1;
	}
	.moves {
		display: flex;
		gap: 0.25rem;
	}
	.icon {
		padding: 0.15rem 0.5rem;
		font-size: 0.75rem;
	}
	.edit {
		text-decoration: underline;
	}
	details[open] .edit {
		visibility: hidden;
	}
	.edit-form {
		display: grid;
		gap: 0.9rem;
		margin-top: 0.9rem;
		padding-top: 0.9rem;
		border-top: 1px solid var(--border);
	}
	.new {
		margin-top: 0.5rem;
	}
</style>
