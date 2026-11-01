<script lang="ts">
	import { ADDON_IMPORTANCES, ADDON_USAGES, IMPORTANCE_INFO, USAGE_LABELS, type AddonImportance } from '$lib/addons';
	import ImportanceBadge from '$lib/components/ImportanceBadge.svelte';
	import { className, classColor } from '$lib/labels';
	import { ROLE_LABELS, type Role } from '$lib/roles';

	let { data } = $props();
	const cfg = $derived(data.config);
	type Addon = (typeof data.addons)[number];

	let search = $state('');
	let usage = $state('');
	let mine = $state(false);
	let statuses = $state<AddonImportance[]>([]);

	// Statuts et usages réellement présents : les filtres ne proposent pas de cases vides.
	const presentStatuses = $derived(ADDON_IMPORTANCES.filter((i) => data.addons.some((a) => a.importance === i)));
	const presentUsages = $derived(ADDON_USAGES.filter((u) => data.addons.some((a) => a.usage === u)));

	const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	// Un addon sans public précis concerne tout le monde ; sinon, la classe ou l'un des rôles du main.
	const forMain = (a: Addon) =>
		!data.main ||
		((!a.classes.length || a.classes.includes(data.main.class)) && (!a.roles.length || a.roles.some((r) => data.main!.roles.includes(r))));
	const rows = $derived(
		data.addons.filter(
			(a) =>
				(!statuses.length || statuses.includes(a.importance)) &&
				(!usage || a.usage === usage) &&
				(!mine || forMain(a)) &&
				(!search.trim() || fold(`${a.name} ${a.description ?? ''}`).includes(fold(search.trim())))
		)
	);
	const toggle = (i: AddonImportance) => (statuses = statuses.includes(i) ? statuses.filter((s) => s !== i) : [...statuses, i]);
	const mainLabel = $derived(data.main ? [className(cfg, data.main.class), ...data.main.roles.map((r) => ROLE_LABELS[r as Role])].join(' · ') : '');
	const filtered = $derived(Boolean(statuses.length || usage || mine || search.trim()));
</script>

<svelte:head><title>Addons · {cfg.guild.name}</title></svelte:head>

<h1>Addons</h1>
<p class="muted lead">
	Ce que la guilde conseille d'installer, du plus important au confort. Le plus simple : l'application CurseForge ou
	Wago, qui les tient à jour (version de jeu World of Warcraft: Forever).
</p>

{#if data.addons.length}
	<div class="card filters">
		<input type="search" placeholder="Rechercher un addon…" aria-label="Rechercher un addon" bind:value={search} />
		<div class="chips" role="group" aria-label="Statut">
			{#each presentStatuses as i (i)}
				<button
					type="button"
					class="chip"
					class:on={statuses.includes(i)}
					class:dim={statuses.length > 0 && !statuses.includes(i)}
					aria-pressed={statuses.includes(i)}
					onclick={() => toggle(i)}
				>
					<ImportanceBadge importance={i} />
				</button>
			{/each}
		</div>
		<select bind:value={usage} aria-label="Usage">
			<option value="">Tous les usages</option>
			{#each presentUsages as u (u)}<option value={u}>{USAGE_LABELS[u]}</option>{/each}
		</select>
		{#if data.main}
			<label class="mine"><input type="checkbox" bind:checked={mine} /> Pour mon main <span class="muted">({mainLabel})</span></label>
		{/if}
		{#if filtered}
			<button
				type="button"
				class="link"
				onclick={() => {
					search = '';
					usage = '';
					mine = false;
					statuses = [];
				}}>Tout afficher</button
			>
		{/if}
	</div>

	<div class="table-wrap card">
		<table>
			<thead>
				<tr>
					<th>Addon</th>
					<th>Statut guilde</th>
					<th>Pourquoi</th>
					<th>Télécharger</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as a (a.id)}
					<tr>
						<td class="name">
							<strong>{a.name}</strong>
							<span class="muted small">{USAGE_LABELS[a.usage]}</span>
						</td>
						<td class="status">
							<ImportanceBadge importance={a.importance} />
							{#if a.roles.length || a.classes.length}
								<span class="who">
									{#each a.roles as r (r)}<span class="tag">{ROLE_LABELS[r]}</span>{/each}
									{#each a.classes as c (c)}<span class="tag" style:color={classColor(cfg, c)}>{className(cfg, c)}</span>{/each}
								</span>
							{/if}
						</td>
						<td class="why">{a.description ?? ''}</td>
						<td class="links">
							{#if a.curseforgeUrl}<a class="button secondary" href={a.curseforgeUrl} target="_blank" rel="noopener">CurseForge</a>{/if}
							{#if a.wagoUrl}<a class="button secondary" href={a.wagoUrl} target="_blank" rel="noopener">Wago</a>{/if}
							{#if a.otherUrl}<a class="button secondary" href={a.otherUrl} target={a.otherUrl.startsWith('/') ? undefined : '_blank'} rel="noopener">{a.otherUrl.endsWith('.zip') ? 'Zip' : 'Site'}</a>{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="muted empty">Aucun addon ne correspond à ces filtres.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="muted small legend">
		{#each presentStatuses as i, n (i)}{#if n}{' · '}{/if}<strong>{IMPORTANCE_INFO[i].label}</strong> : {IMPORTANCE_INFO[i].hint.toLowerCase()}{/each}
	</p>
{:else}
	<p class="card muted">La guilde n’a pas encore publié sa liste d’addons.</p>
{/if}

<style>
	h1 {
		margin: 0 0 0.35rem;
	}
	.lead {
		margin: 0 0 1.25rem;
		max-width: 65ch;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1rem;
		margin-bottom: 1rem;
	}
	.filters input[type='search'] {
		flex: 1 1 14rem;
		width: auto;
	}
	.filters select {
		width: auto;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		padding: 0.15rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 999px;
	}
	/* Un filtre est choisi : les autres statuts s'estompent. */
	.chip.dim {
		opacity: 0.45;
	}
	.chip:hover {
		background: var(--surface-2);
	}
	.chip.on {
		opacity: 1;
		border-color: var(--border);
	}
	.mine {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text);
		font-size: 0.92rem;
	}
	.mine input {
		width: auto;
	}
	button.link {
		background: none;
		border: none;
		padding: 0;
		color: var(--muted);
		text-decoration: underline;
		font-size: 0.9rem;
	}
	.table-wrap {
		padding: 0;
	}
	td {
		vertical-align: top;
	}
	.name {
		min-width: 11rem;
	}
	.name .small {
		display: block;
		margin-top: 0.1rem;
	}
	.name strong {
		color: var(--gold);
	}
	.status {
		min-width: 9rem;
	}
	.who {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.35rem;
	}
	.tag {
		padding: 0 0.45rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.78rem;
	}
	.why {
		white-space: normal;
		min-width: 18rem;
		line-height: 1.5;
		font-size: 0.92rem;
	}
	.links {
		white-space: nowrap;
	}
	.links .button {
		padding: 0.25rem 0.65rem;
		font-size: 0.82rem;
	}
	.links .button + .button {
		margin-left: 0.3rem;
	}
	.small {
		font-size: 0.82rem;
	}
	.empty {
		text-align: center;
		padding: 1.5rem;
	}
	.legend {
		margin: 0.75rem 0 0;
		line-height: 1.6;
	}

	/* Téléphone : chaque addon devient un bloc, sans défilement horizontal. */
	@media (max-width: 44rem) {
		thead {
			display: none;
		}
		tr {
			display: grid;
			gap: 0.4rem;
			padding: 0.85rem 1rem;
			border-bottom: 1px solid var(--border);
		}
		td {
			display: block;
			padding: 0;
			border: none;
			min-width: 0;
		}
		.links {
			white-space: normal;
		}
	}
</style>
