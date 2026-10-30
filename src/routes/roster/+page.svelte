<script lang="ts">
	import GameBadge from '$lib/components/GameBadge.svelte';
	import { ROLES, ROLE_LABELS } from '$lib/roles';
	import { FACTIONS, FACTION_LABELS } from '$lib/game/forever';
	import { enhance } from '$app/forms';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { AXIS_LABELS, INTEREST_AXES, INTEREST_LEVELS, LEVEL_LABELS } from '$lib/interests';
	import { className, classColor, fullName, professionNames, raceName, specRole } from '$lib/labels';

	let { data } = $props();
	const cfg = $derived(data.config);
	const total = $derived(data.rows.length);
	const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

	function submit(e: Event) {
		(e.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit();
	}
</script>

<div class="row head">
	<h1>Roster</h1>
	{#if data.officer}<a href="/admin/rosters" class="muted">Gérer les rosters</a>{/if}
</div>

<nav class="tabs" aria-label="Rosters">
	<a href="/roster" aria-current={!data.roster ? 'page' : undefined}>Toute la guilde</a>
	{#each data.rosters as r (r.id)}
		<a href="/roster?equipe={r.id}" aria-current={data.roster?.id === r.id ? 'page' : undefined}>
			{r.name}{#if r.visibility === 'officers'}<span class="private" title="Réservé aux officiers"> · officiers</span>{/if}
		</a>
	{/each}
</nav>

{#if data.roster}
	<section class="card roster-head">
		<div>
			<h2>{data.roster.name}</h2>
			{#if data.roster.description}<p class="muted">{data.roster.description}</p>{/if}
		</div>
		{#if data.officer}
			<form method="POST" action="?/add" use:enhance class="row add">
				<input type="hidden" name="rosterId" value={data.roster.id} />
				<select name="characterId" required aria-label="Perso à ajouter">
					<option value="">Ajouter un perso…</option>
					{#each data.candidates as c (c.id)}
						<option value={c.id}>{c.player} — {c.name} ({className(cfg, c.class)}{c.isMain ? ', main' : ''})</option>
					{/each}
				</select>
				<button>Ajouter</button>
			</form>
		{/if}
	</section>
{/if}

<form method="GET" class="card row filters" data-sveltekit-keepfocus>
	{#if data.roster}<input type="hidden" name="equipe" value={data.roster.id} />{/if}
	<label>
		Classe
		<select name="classe" value={data.filters.classe} onchange={submit}>
			<option value="">Toutes</option>
			{#each cfg.classes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
		</select>
	</label>
	<label>
		Rôle
		<select name="role" value={data.filters.role} onchange={submit}>
			<option value="">Tous</option>
			{#each ROLES as r (r)}<option value={r}>{ROLE_LABELS[r]}</option>{/each}
		</select>
	</label>
	<label class="inline">
		<input type="checkbox" name="secondaire" value="1" checked={data.filters.secondaire} onchange={submit} />
		Inclure les spés secondaires
	</label>
	{#if cfg.guild.faction === 'both'}
		<label>
			Faction
			<select name="faction" value={data.filters.faction} onchange={submit}>
				<option value="">Les deux</option>
				{#each FACTIONS as f (f)}<option value={f}>{FACTION_LABELS[f]}</option>{/each}
			</select>
		</label>
	{/if}
	<label>
		Type
		<select name="type" value={data.filters.type} onchange={submit}>
			<option value="tous">Mains et rerolls</option>
			<option value="main">Mains</option>
			<option value="reroll">Rerolls</option>
		</select>
	</label>
	{#each INTEREST_AXES as axis (axis)}
		<label>
			{AXIS_LABELS[axis]}
			<select name={axis} value={data.filters[axis]} onchange={submit}>
				<option value="">Indifférent</option>
				{#each INTEREST_LEVELS as level (level)}<option value={level}>{LEVEL_LABELS[level]}</option>{/each}
			</select>
		</label>
	{/each}
	<label>
		Métier
		<select name="metier" value={data.filters.metier} onchange={submit}>
			<option value="">Tous</option>
			{#each cfg.professions as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
		</select>
	</label>
	{#if data.filters.metier}
		<label class="narrow">
			Niveau min.
			<input type="number" name="niveau" min="1" max="300" value={data.filters.niveau} onchange={submit} />
		</label>
	{/if}
	<noscript><button>Filtrer</button></noscript>
	<a href={data.roster ? `/roster?equipe=${data.roster.id}` : '/roster'} class="muted">Réinitialiser</a>
</form>

<section class="stats">
	<div class="card">
		<h2>Par rôle <span class="muted">({total})</span></h2>
		{#each ROLES as r (r)}
			<div class="bar">
				<span>{ROLE_LABELS[r]}</span>
				<span class="track"><span class="fill" style:width="{pct(data.byRole[r])}%"></span></span>
				<span class="count">{data.byRole[r]}</span>
				<span class="extra muted">{data.byRole2[r] ? `+${data.byRole2[r]}` : ''}</span>
			</div>
		{/each}
		<p class="muted legend">+N : persos qui peuvent aussi tenir ce rôle en spé secondaire.</p>
	</div>
	<div class="card">
		<h2>Par classe</h2>
		{#each cfg.classes as c (c.id)}
			{@const n = data.byClass[c.id] ?? 0}
			<div class="bar">
				<span style:color={c.color}>{c.name}</span>
				<span class="track"><span class="fill" style:width="{pct(n)}%" style:background={c.color}></span></span>
				<span class="count">{n}</span>
			</div>
		{/each}
	</div>
</section>

<div class="card table-wrap">
	{#if total === 0}
		<p class="muted">
			{data.roster && !data.rows.length && data.officer ? 'Ce roster est vide : ajoute des persos avec le menu ci-dessus.' : 'Aucun perso ne correspond.'}
		</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Perso</th>
					<th>Reroll de</th>
					<th>Joueur</th>
					<th>Classe</th>
					<th>Spé principale</th>
					<th>Spé secondaire</th>
					<th>Niv.</th>
					<th>Race</th>
					<th>Intérêts</th>
					<th>Métiers</th>
					{#if data.roster && data.officer}<th></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.rows as c (c.id)}
					<tr>
						<td>
							{fullName(c)}
							{#if c.isMain}<span class="badge main">Main</span>{/if}
							<GameBadge character={c} importAt={data.gameImportAt} />
						</td>
						<td class="muted">{c.isMain ? '' : `↳ ${c.mainName ?? '?'}`}</td>
						<td><a class="player" href="/joueurs/{c.playerId}">{c.player}</a></td>
						<td style:color={classColor(cfg, c.class)}>{className(cfg, c.class)}</td>
						<td>{specRole(cfg, c.class, c.spec, c.role)}</td>
						<td class="muted">{specRole(cfg, c.class, c.spec2, c.role2)}</td>
						<td>{c.level}</td>
						<td>{raceName(cfg, c.race)}</td>
						<td><InterestBadges pve={c.pve} pvp={c.pvp} compact /></td>
						<td class="muted" title={c.recipes ?? undefined}>{professionNames(cfg, c.professions)}</td>
						{#if data.roster && data.officer}
							<td>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="rosterId" value={data.roster.id} />
									<input type="hidden" name="characterId" value={c.id} />
									<button class="secondary small-btn" title="Retirer de {data.roster.name}">Retirer</button>
								</form>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.head {
		justify-content: space-between;
		align-items: baseline;
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.tabs a {
		padding: 0.35rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text);
		text-decoration: none;
	}
	.tabs a[aria-current='page'] {
		border-color: var(--accent);
		background: var(--surface-2);
		color: var(--gold);
	}
	.private {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.roster-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.roster-head h2 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--gold);
	}
	.roster-head p {
		margin: 0.25rem 0 0;
	}
	.add select {
		width: auto;
		max-width: 22rem;
	}
	.small-btn {
		padding: 0.2rem 0.6rem;
		font-size: 0.82rem;
	}
	.filters {
		align-items: end;
		margin-bottom: 1rem;
	}
	.filters .narrow {
		min-width: 0;
		width: 7rem;
	}
	.filters label {
		min-width: 10rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.stats h2 {
		margin-top: 0;
		font-size: 1rem;
	}
	.bar {
		display: grid;
		grid-template-columns: 7rem 1fr 2rem 2rem;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.9rem;
	}
	.track {
		height: 0.55rem;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.legend {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
	}
	.filters .inline {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		align-self: center;
	}
	.count {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.badge {
		margin-left: 0.35rem;
	}
	.player {
		color: var(--text);
	}
</style>
