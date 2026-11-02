<script lang="ts">
	import { page } from '$app/state';
	import GameBadge from '$lib/components/GameBadge.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import { ROLES, ROLE_ICONS, ROLE_LABELS } from '$lib/roles';
	import { FACTIONS, FACTION_LABELS } from '$lib/game/forever';
	import { enhance } from '$app/forms';
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { AXIS_LABELS, INTEREST_AXES, INTEREST_LEVELS, LEVEL_LABELS } from '$lib/interests';
	import { className, classColor, professionNames, raceName, specRole } from '$lib/labels';
	import { sortRows, type SortDir, type SortValue } from '$lib/sort';

	let { data } = $props();
	const cfg = $derived(data.config);
	const total = $derived(data.rows.length);

	type Row = (typeof data.rows)[number];
	// Colonnes triables : valeur comparée et sens du premier clic (les nombres commencent par le plus grand).
	const interestScore = (v: string | null) => (v === 'competitive' ? 2 : v === 'casual' ? 1 : 0);
	const COLUMNS: { key: string; label: string; value: (c: Row) => SortValue; first?: SortDir }[] = [
		{ key: 'perso', label: 'Perso', value: (c) => c.name },
		{ key: 'joueur', label: 'Joueur', value: (c) => c.player },
		{ key: 'classe', label: 'Classe', value: (c) => className(cfg, c.class) },
		{ key: 'spe', label: 'Spé', value: (c) => specRole(cfg, c.class, c.spec, c.role) },
		{ key: 'niveau', label: 'Niv.', value: (c) => c.level, first: 'desc' },
		{ key: 'race', label: 'Race', value: (c) => raceName(cfg, c.race) },
		{ key: 'interets', label: 'Intérêts', value: (c) => interestScore(c.pve) + interestScore(c.pvp) || null, first: 'desc' },
		{ key: 'metiers', label: 'Métiers', value: (c) => professionNames(cfg, c.professions) }
	];

	// Tri dans le navigateur ; il est conservé quand on change de filtre. Sans tri : l'ordre du serveur (classe, main, nom).
	let sort = $state<{ key: string; dir: SortDir } | null>(null);
	const rows = $derived.by(() => {
		const col = sort && COLUMNS.find((k) => k.key === sort!.key);
		return col ? sortRows(data.rows, col.value, sort!.dir) : data.rows;
	});
	function sortBy(col: (typeof COLUMNS)[number]) {
		sort = sort?.key === col.key ? { key: col.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: col.first ?? 'asc' };
	}
	function sortByKey(key: string) {
		const col = COLUMNS.find((k) => k.key === key);
		sort = col ? { key: col.key, dir: col.first ?? 'asc' } : null;
	}
	const ariaSort = (key: string) => (sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined);

	// Rôles et classes se choisissent d'un clic ; un second clic retire le filtre.
	function toggle(key: 'role' | 'classe', value: string) {
		const params = new URLSearchParams(page.url.search);
		if (params.get(key) === value) params.delete(key);
		else params.set(key, value);
		const query = params.toString();
		return query ? `/roster?${query}` : '/roster';
	}
	const active = $derived(
		Boolean(data.filters.classe || data.filters.role || data.filters.secondaire || data.filters.faction || data.filters.pve || data.filters.pvp || data.filters.metier) ||
			data.filters.type !== (data.roster ? 'tous' : 'main')
	);

	function submit(e: Event) {
		(e.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit();
	}
</script>

<div class="page-head">
	<div>
		<h1>Roster</h1>
		<nav class="seg tabs" aria-label="Rosters">
			<a href="/roster" aria-current={!data.roster ? 'page' : undefined}>Toute la guilde</a>
			{#each data.rosters as r (r.id)}
				<a href="/roster?equipe={r.id}" aria-current={data.roster?.id === r.id ? 'page' : undefined}>
					{r.name}{#if r.visibility === 'officers'}<span class="private" title="Réservé aux officiers"><Glyph name="lock" size={13} /></span>{/if}
				</a>
			{/each}
		</nav>
	</div>
	{#if data.officer}<a href="/admin/rosters">Gérer les rosters</a>{/if}
</div>

{#if data.roster}
	<section class="roster-head">
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

<section class="picker" aria-label="Filtrer par rôle">
	{#each ROLES as r (r)}
		<a class="role" class:on={data.filters.role === r} href={toggle('role', r)} aria-current={data.filters.role === r ? 'true' : undefined} data-sveltekit-noscroll data-sveltekit-keepfocus>
			<span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={20} /></span>
			<span class="r-name">{ROLE_LABELS[r]}</span>
			<span class="r-n">
				<span class="serif num">{data.byRole[r]}</span>
				{#if data.byRole2[r]}<span class="muted small num" title="Persos qui peuvent aussi tenir ce rôle en spé secondaire">+{data.byRole2[r]}</span>{/if}
			</span>
		</a>
	{/each}
</section>

<section class="classes" aria-label="Filtrer par classe">
	{#each cfg.classes as c (c.id)}
		{@const n = data.byClass[c.id] ?? 0}
		<a class:on={data.filters.classe === c.id} class:none={!n} href={toggle('classe', c.id)} aria-current={data.filters.classe === c.id ? 'true' : undefined} data-sveltekit-noscroll data-sveltekit-keepfocus>
			<span class="dot" style:--c={c.color}></span>{c.name} <span class="num muted">{n}</span>
		</a>
	{/each}
</section>

<form method="GET" class="refine" data-sveltekit-keepfocus data-sveltekit-noscroll>
	{#if data.roster}<input type="hidden" name="equipe" value={data.roster.id} />{/if}
	{#if data.filters.classe}<input type="hidden" name="classe" value={data.filters.classe} />{/if}
	{#if data.filters.role}<input type="hidden" name="role" value={data.filters.role} />{/if}
	<select name="type" value={data.filters.type} onchange={submit} aria-label="Type de perso">
		<option value="tous">Mains et rerolls</option>
		<option value="main">Mains</option>
		<option value="reroll">Rerolls</option>
	</select>
	{#each INTEREST_AXES as axis (axis)}
		<select name={axis} value={data.filters[axis]} onchange={submit} aria-label={AXIS_LABELS[axis]}>
			<option value="">{AXIS_LABELS[axis]} : indifférent</option>
			{#each INTEREST_LEVELS as level (level)}<option value={level}>{AXIS_LABELS[axis]} : {LEVEL_LABELS[level].toLowerCase()}</option>{/each}
		</select>
	{/each}
	<select name="metier" value={data.filters.metier} onchange={submit} aria-label="Métier">
		<option value="">Tous les métiers</option>
		{#each cfg.professions as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
	</select>
	{#if data.filters.metier}
		<input class="level" type="number" name="niveau" min="1" max="300" value={data.filters.niveau} onchange={submit} aria-label="Niveau de métier minimum" placeholder="Niv. min." />
	{/if}
	{#if cfg.guild.faction === 'both'}
		<select name="faction" value={data.filters.faction} onchange={submit} aria-label="Faction">
			<option value="">Les deux factions</option>
			{#each FACTIONS as f (f)}<option value={f}>{FACTION_LABELS[f]}</option>{/each}
		</select>
	{/if}
	<label class="check">
		<input type="checkbox" name="secondaire" value="1" checked={data.filters.secondaire} onchange={submit} />
		Rôle en spé secondaire aussi
	</label>
	<noscript><button>Filtrer</button></noscript>
	{#if active}<a href={data.roster ? `/roster?equipe=${data.roster.id}` : '/roster'}>Réinitialiser</a>{/if}
</form>

<p class="list-head muted" aria-live="polite"><strong class="num">{total}</strong> perso{total > 1 ? 's' : ''}</p>

{#if total === 0}
	<p class="empty">
		{data.roster && data.officer && !active ? 'Ce roster est vide : ajoute des persos avec le menu ci-dessus.' : 'Aucun perso ne correspond à ces filtres.'}
	</p>
{:else}
	<div class="card table-wrap">
		<table>
			<thead>
				<tr>
					{#each COLUMNS as col (col.key)}
						<th aria-sort={ariaSort(col.key)}>
							<button type="button" class="sort" onclick={() => sortBy(col)} title="Trier par {col.label.toLowerCase()}">
								{col.label}<span class="arrow" aria-hidden="true">{sort?.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
							</button>
						</th>
					{/each}
					{#if data.roster && data.officer}<th><span class="visually-hidden">Actions</span></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each rows as c (c.id)}
					<tr>
						<td>
							<div class="perso">
								<span class="name"><strong>{c.name}</strong>{#if c.surname}{' '}<span class="muted">{c.surname}</span>{/if}</span>
								<span class="tags">
									{#if c.isMain}<span class="badge main">Main</span>{:else}<span class="muted small">reroll de {c.mainName ?? '?'}</span>{/if}
									<GameBadge character={c} importAt={data.gameImportAt} />
								</span>
							</div>
						</td>
						<td><a class="player" href="/joueurs/{c.playerId}">{c.player}</a></td>
						<td><span class="dot" style:--c={classColor(cfg, c.class)}></span> {className(cfg, c.class)}</td>
						<td>
							<span class="spec">
								<span class="mark" style:color="var(--r-{c.role})" title={ROLE_LABELS[c.role]}><Glyph name={ROLE_ICONS[c.role]} size={15} /></span>
								{specRole(cfg, c.class, c.spec, c.role)}
							</span>
							{#if c.spec2 || c.role2}<span class="muted small second">aussi {specRole(cfg, c.class, c.spec2, c.role2)}</span>{/if}
						</td>
						<td class="num">{c.level}</td>
						<td>{raceName(cfg, c.race)}</td>
						<td><InterestBadges pve={c.pve} pvp={c.pvp} compact /></td>
						<td class="muted small profs" title={c.recipes ?? undefined}>
							{#each professionNames(cfg, c.professions).split(', ').filter(Boolean) as name (name)}<span>{name}</span>{/each}
						</td>
						{#if data.roster && data.officer}
							<td>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="rosterId" value={data.roster.id} />
									<input type="hidden" name="characterId" value={c.id} />
									<button class="secondary small" title="Retirer de {data.roster.name}">Retirer</button>
								</form>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Téléphone : une carte par perso, plus lisible qu'un tableau à faire défiler. -->
	<div class="mobile">
		<label class="mobile-sort">
			Trier par
			<select value={sort?.key ?? ''} onchange={(e) => sortByKey(e.currentTarget.value)}>
				<option value="">Classe</option>
				{#each COLUMNS.filter((k) => k.key !== 'classe') as col (col.key)}<option value={col.key}>{col.label}</option>{/each}
			</select>
		</label>
		<ul class="cards">
			{#each rows as c (c.id)}
				<li>
					<div class="c-top">
						<span class="crest" style:--c={classColor(cfg, c.class)} title={ROLE_LABELS[c.role]}><Glyph name={ROLE_ICONS[c.role]} size={18} /></span>
						<div class="c-id">
							<span class="name"><strong>{c.name}</strong>{#if c.surname}{' '}<span class="muted">{c.surname}</span>{/if}</span>
							<span class="muted small">{className(cfg, c.class)} · {specRole(cfg, c.class, c.spec, c.role)}</span>
						</div>
						<span class="muted small num">niv. {c.level}</span>
					</div>
					<div class="tags">
						{#if c.isMain}<span class="badge main">Main</span>{:else}<span class="muted small">reroll de {c.mainName ?? '?'}</span>{/if}
						<GameBadge character={c} importAt={data.gameImportAt} />
						<InterestBadges pve={c.pve} pvp={c.pvp} compact />
					</div>
					<p class="muted small">
						<a class="player" href="/joueurs/{c.playerId}">{c.player}</a>{#if c.race}{' · '}{raceName(cfg, c.race)}{/if}{#if c.spec2 || c.role2}{' · '}aussi {specRole(cfg, c.class, c.spec2, c.role2)}{/if}
					</p>
					{#if c.professions.length}<p class="small">{professionNames(cfg, c.professions)}</p>{/if}
					{#if data.roster && data.officer}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="rosterId" value={data.roster.id} />
							<input type="hidden" name="characterId" value={c.id} />
							<button class="secondary small">Retirer de {data.roster.name}</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.tabs {
		margin-top: 1.25rem;
	}
	.private {
		display: inline-flex;
		color: var(--muted);
	}
	.roster-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}
	.roster-head h2 {
		margin: 0;
	}
	.roster-head p {
		margin: 0.25rem 0 0;
	}
	.add select {
		width: auto;
		max-width: 22rem;
	}
	.picker {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}
	.role {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.875rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		text-decoration: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.role:hover {
		border-color: color-mix(in oklab, var(--accent) 45%, var(--border));
	}
	.role.on {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}
	.mark {
		display: inline-flex;
	}
	.r-name {
		font-weight: 500;
	}
	.r-n {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		margin-left: auto;
	}
	.r-n .serif {
		font-size: 1.625rem;
		line-height: 1;
	}
	.classes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 1rem;
	}
	.classes a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.375rem 0.625rem;
		border-radius: 999px;
		color: var(--text);
		font-size: 0.9375rem;
		text-decoration: none;
		transition: background 0.15s;
	}
	.classes a:hover {
		background: var(--tint);
	}
	.classes a.on {
		background: var(--tint);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.classes a.none {
		color: var(--muted);
	}
	.refine {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-block: 1rem;
		border-block: 1px solid var(--border);
	}
	.refine select {
		width: auto;
		min-height: 38px;
		padding-block: 0.25rem;
		font-size: 0.9375rem;
	}
	.refine .level {
		width: 7rem;
		min-height: 38px;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 400;
	}
	.list-head {
		margin: 1.75rem 0 0.75rem;
	}
	.list-head strong {
		color: var(--text);
	}
	.table-wrap {
		padding: 0.5rem 0.75rem;
	}
	.perso {
		display: grid;
		gap: 0.125rem;
	}
	.name strong {
		font-weight: 600;
	}
	.tags {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.spec {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}
	.second {
		display: block;
	}
	.player {
		color: var(--text);
	}
	.profs span {
		display: block;
	}
	button.sort {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: inherit;
		font: inherit;
	}
	button.sort:hover,
	th[aria-sort] button.sort {
		color: var(--text);
	}
	button.sort:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
		border-radius: 3px;
	}
	.arrow {
		font-size: 0.7rem;
		opacity: 0.45;
	}
	th[aria-sort] .arrow {
		opacity: 1;
		color: var(--gold);
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.mobile {
		display: none;
	}
	.mobile-sort {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		white-space: nowrap;
	}
	.mobile-sort select {
		min-height: 38px;
		padding-block: 0.25rem;
	}
	.cards {
		list-style: none;
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
	}
	.cards li {
		display: grid;
		gap: 0.5rem;
		padding: 1rem 1.125rem;
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.cards p {
		margin: 0;
	}
	.c-top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.crest {
		flex: none;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--c) 16%, var(--surface));
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--c) 45%, rgb(0 0 0 / 0.3));
	}
	.c-id {
		flex: 1;
		display: grid;
		min-width: 0;
		line-height: 1.3;
	}
	.cards .tags {
		flex-wrap: wrap;
	}
	@media (max-width: 760px) {
		.table-wrap {
			display: none;
		}
		.mobile {
			display: block;
		}
		.picker {
			grid-template-columns: 1fr 1fr;
		}
		.refine select {
			flex: 1 1 42%;
		}
	}
</style>
