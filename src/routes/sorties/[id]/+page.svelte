<script lang="ts">
	import Glyph from '$lib/components/Glyph.svelte';
	import { ROLES, ROLE_ICONS, ROLE_LABELS } from '$lib/roles';
	import { className, classColor, fullName, specName } from '$lib/labels';
	import { RAID_HELPER } from '$lib/game/forever';

	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();
	const su = $derived(data.signup);
	let characterId = $state<number | null>(null);
	// Par défaut, le perso et le statut de l'inscription actuelle (sinon le main, présent).
	const chosen = $derived(
		su?.characters.find((c) => c.id === (characterId ?? (su.characters.find((k) => k.name === su.current?.name) ?? su.characters.find((k) => k.isMain))?.id)) ?? null
	);
	let status = $derived(su?.current && su.current.category !== 'present' && su.current.category in su.statuses ? su.current.category : 'present');
	const cfg = $derived(data.config);
	const comp = $derived(data.composition);
	const cmp = $derived(data.roster);

	// Petit groupe (donjon, quêtes…) : objectif 1 tank, 1 soigneur, le reste en DPS.
	const small = $derived(data.event.limit !== null && data.event.limit <= 5);
	const groupSlots = $derived.by(() => {
		const size = data.event.limit ?? 5;
		const dps = comp.byRole.melee.length + comp.byRole.ranged.length;
		return [
			{ label: 'Tank', role: 'tank', have: comp.byRole.tank.length, need: 1 },
			{ label: 'Soigneur', role: 'healer', have: comp.byRole.healer.length, need: 1 },
			{ label: 'DPS', role: 'dps', have: dps, need: Math.max(size - 2, 0) }
		];
	});
	const missing = $derived(groupSlots.filter((g) => g.have < g.need).map((g) => `${g.need - g.have} ${g.label.toLowerCase()}${g.need - g.have > 1 && g.label !== 'DPS' ? 's' : ''}`));
	const full = $derived(Boolean(data.event.limit && comp.presentCount >= data.event.limit));
	const free = $derived(data.event.limit ? Math.max(data.event.limit - comp.presentCount, 0) : null);

	function submit(e: Event) {
		(e.currentTarget as HTMLSelectElement).form?.requestSubmit();
	}
</script>

<a class="back" href="/sorties"><Glyph name="arrow-left" size={16} /> Sorties</a>

<header class="head">
	{#if data.event.image}<img class="cover" src={data.event.image} alt="" />{/if}
	<div class="head-row">
		<div>
			<p class="eyebrow">{data.event.limit ? `${data.event.limit} places` : 'Sortie'}</p>
			<h1>{data.event.title}</h1>
			<p class="meta muted">
				{data.event.when}{#if data.event.leader}{' '}· organisé par {data.event.leader}{/if}
			</p>
		</div>
		<div class="actions">
			<a class="button secondary small" href="https://raid-helper.dev/event/{data.event.id}" target="_blank" rel="noopener"><Glyph name="external" size={16} /> Raid-Helper</a>
			<a class="button secondary small" href="/sorties/{data.event.id}?actualiser" data-sveltekit-reload title="Relire les inscriptions sur Raid-Helper"><Glyph name="refresh" size={16} /> Actualiser</a>
			{#if data.canDelete}
				<form
					method="POST"
					action="?/delete"
					use:enhance
					onsubmit={(e) => {
						const n = comp.presentCount + comp.benchCount;
						if (!window.confirm(`Supprimer « ${data.event.title} » ? Le message disparaîtra de Discord${n ? ` et les ${n} inscriptions seront perdues` : ''}.`)) e.preventDefault();
					}}
				>
					<button class="danger small"><Glyph name="trash" size={16} /> Supprimer</button>
				</form>
			{/if}
		</div>
	</div>
	{#if form?.deleteError}<p class="notice bad"><Glyph name="warning" /> {form.deleteError}</p>{/if}
	{#if form?.edited}<p class="notice ok"><Glyph name="check" /> Sortie modifiée, sur le site comme sur Discord.</p>{/if}
</header>

{#if data.edit}
	{@const ev = data.edit.values}
	<details class="card edit" open={Boolean(form?.editError)}>
		<summary><Glyph name="pencil" size={16} /> Modifier la sortie</summary>
		{#if form?.editError}<p class="error">{form.editError}</p>{/if}
		<form method="POST" action="?/edit" use:enhance={keepValues} class="edit-form">
			<div class="wide">
				<label for="edit-title">Titre</label>
				<input id="edit-title" name="title" required minlength="2" maxlength="100" value={ev.title} />
			</div>
			<div class="wide">
				<label for="edit-description">Description <span class="muted">(affichée dans l'événement sur Discord)</span></label>
				<textarea id="edit-description" name="description" rows="4" maxlength="1500">{ev.description}</textarea>
			</div>
			<div>
				<label for="edit-date">Date</label>
				<input id="edit-date" name="date" type="date" required value={ev.date} />
			</div>
			<div>
				<label for="edit-time">Heure ({data.edit.timezone})</label>
				<input id="edit-time" name="time" type="time" required value={ev.time} />
			</div>
			{#if data.edit.officers}
				<div>
					<label for="edit-leader">Chef de raid</label>
					<select id="edit-leader" name="leaderId" required value={ev.leaderId}>
						{#if ev.leaderId && !data.edit.officers.some((o) => o.id === ev.leaderId)}<option value={ev.leaderId}>{data.event.leader || ev.leaderId}</option>{/if}
						{#each data.edit.officers as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
					</select>
				</div>
			{:else}
				<input type="hidden" name="leaderId" value={ev.leaderId} />
			{/if}
			<div class="wide row"><button>Enregistrer les modifications</button></div>
		</form>
	</details>
{/if}

<div class="layout" class:solo={!su && !(data.rosters.length && !small)}>
	<div class="comp">
		<div class="summary">
			<span class="serif num filled">{comp.presentCount}{#if data.event.limit}<small> / {data.event.limit}</small>{/if}</span>
			<div>
				{#if full}
					<span class="badge good"><Glyph name="check" size={14} /> Complet</span>
				{:else if free !== null}
					<span class="badge warn">{free} place{free > 1 ? 's' : ''} libre{free > 1 ? 's' : ''}</span>
				{:else}
					<span class="badge plain">inscrits</span>
				{/if}
				<p class="muted small">
					{#if comp.benchCount}{comp.benchCount} sur le banc{:else}Personne sur le banc{/if}
				</p>
			</div>
		</div>
		{#if comp.withoutAccount || comp.withoutCharacter}
			<p class="notice warn">
				<Glyph name="warning" />
				<span>
					{#if comp.withoutAccount}{comp.withoutAccount} inscrit{comp.withoutAccount > 1 ? 's' : ''} sans compte sur le site.{/if}
					{#if comp.withoutCharacter}{comp.withoutCharacter} sans perso de la classe inscrite.{/if}
				</span>
			</p>
		{/if}

		{#if small}
			<section class="strip" aria-label="Composition du groupe">
				{#each groupSlots as g (g.label)}
					<span class="slot" class:done={g.have >= g.need}>
						{#if g.role !== 'dps'}<span class="mark" style:color="var(--r-{g.role})"><Glyph name={ROLE_ICONS[g.role as 'tank' | 'healer']} size={16} /></span>{:else}<span class="mark" style:color="var(--r-melee)"><Glyph name="swords" size={16} /></span>{/if}
						{g.label} <strong class="num">{g.have}/{g.need}</strong>
					</span>
				{/each}
				<span class="strip-note" class:ok={!missing.length}>{missing.length ? `Il manque : ${missing.join(', ')}.` : 'Groupe complet en rôles.'}</span>
			</section>
		{:else}
			<section class="strip" aria-label="Classes présentes, utile pour les buffs de raid">
				{#each cfg.classes as c (c.id)}
					{@const n = comp.byClass[c.id] ?? 0}
					<span class="cover-class" class:none={!n} title={n ? `${n} ${c.name}` : `Aucun ${c.name} : ses buffs manqueront`}>
						<span class="dot" style:--c={c.color}></span>{c.name}<strong class="num">{n}</strong>
					</span>
				{/each}
			</section>
		{/if}

		<div class="roles">
			{#each ROLES as r (r)}
				<section>
					<h2>
						<span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={18} /></span>
						{ROLE_LABELS[r]} <span class="muted num">{comp.byRole[r].length}</span>
						{#if comp.backups[r].length}<span class="backup muted" title="Inscrits d'un autre rôle qui peuvent le tenir (spé secondaire ou reroll)">+{comp.backups[r].length} possible{comp.backups[r].length > 1 ? 's' : ''}</span>{/if}
					</h2>
					<ul>
						{#each comp.byRole[r] as s (s.id)}
							<li>
								<span class="pos muted num">{s.position}</span>
								<span class="dot" style:--c={s.class ? classColor(cfg, s.class) : 'transparent'}></span>
								<div class="who">
									<strong>{s.name}</strong>
									<span class="muted small">
										{#if s.class}{className(cfg, s.class)}{#if s.spec}{' '}{specName(cfg, s.class, s.spec)}{/if}{:else}{s.rhSpec ?? '?'}{/if}
										{#if s.otherRoles.length}{' · '}peut aussi {#each s.otherRoles as o, i (o.role)}{i ? ', ' : ''}{ROLE_LABELS[o.role].toLowerCase()} ({o.via}){/each}{/if}
									</span>
									{#if !s.player}
										<span class="flag small">Pas de compte sur le site</span>
									{:else if !s.character}
										<span class="flag small"><a href="/joueurs/{s.player.id}">{s.player.displayName}</a> : aucun perso {s.class ? className(cfg, s.class) : ''} renseigné</span>
									{/if}
									{#if s.note}<span class="muted small">« {s.note} »</span>{/if}
								</div>
								{#if s.player && s.character}
									<a class="site muted small" href="/joueurs/{s.player.id}" title="{fullName(s.character)}, {s.character.isMain ? 'main' : 'reroll'}">
										{s.character.isMain ? '' : 'reroll · '}niv. {s.character.level}
									</a>
								{/if}
							</li>
						{:else}
							<li class="none muted small">Personne pour l'instant</li>
						{/each}
					</ul>
					{#if comp.bench[r].length}
						<p class="bench small">
							<span class="muted">Sur le banc :</span>
							{#each comp.bench[r] as b, i (b.id)}{i ? ', ' : ' '}<span class="cls"><span class="dot" style:--c={b.class ? classColor(cfg, b.class) : 'transparent'}></span>{b.name}</span>{/each}
						</p>
					{/if}
				</section>
			{/each}
		</div>

		{#if comp.statuses.length || comp.unknown.length}
			<section class="others">
				{#each comp.statuses as g (g.key)}
					<div>
						<p class="muted small">{g.label} <span class="num">({g.signups.length})</span></p>
						<p>{g.signups.map((s) => s.name).join(', ')}</p>
					</div>
				{/each}
				{#if comp.unknown.length}
					<div>
						<p class="muted small">Non classés <span class="num">({comp.unknown.length})</span></p>
						<p>{comp.unknown.map((s) => `${s.name} (${s.category})`).join(', ')}</p>
					</div>
				{/if}
			</section>
		{/if}

		{#if cmp}
			<section class="compare-res">
				<h2>Comparaison avec « {cmp.name} »</h2>
				<div class="cmp-roles">
					{#each ROLES as r (r)}
						<div class:short={cmp.signed[r] < cmp.target[r]}>
							<span class="muted small"><span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={14} /></span> {ROLE_LABELS[r]}</span>
							<strong class="serif num">{cmp.signed[r]} / {cmp.target[r]}</strong>
						</div>
					{/each}
				</div>
				<p class="muted small">Inscrits du roster / persos prévus dans « {cmp.name} », par rôle.</p>
				<div class="cmp-lists">
					<div>
						<h3>Inscrits du roster <span class="muted num">({cmp.registered.length})</span></h3>
						<ul>
							{#each cmp.registered as m (m.id)}
								<li>
									<span class="cls"><span class="dot" style:--c={classColor(cfg, m.class)}></span>{m.name}</span>
									<span class="muted">· {m.player}</span>
									{#if m.otherCharacter}
										<span class="flag">inscrit avec un autre perso ({m.signup.class ? className(cfg, m.signup.class) : m.signup.name})</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<h3>Absents du roster <span class="muted num">({cmp.missing.length})</span></h3>
						<ul>
							{#each cmp.missing as m (m.id)}
								<li>
									<span class="cls"><span class="dot" style:--c={classColor(cfg, m.class)}></span>{m.name}</span>
									<span class="muted">· {m.player} · {ROLE_LABELS[m.role]}</span>
									<span class={m.status ? 'muted' : 'flag'}>{m.status ?? 'pas inscrit'}</span>
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<h3>Inscrits hors roster <span class="muted num">({cmp.outsiders.length})</span></h3>
						<ul>
							{#each cmp.outsiders as s (s.id)}
								<li>
									{s.name}
									<span class="muted">· {s.class ? className(cfg, s.class) : (s.rhSpec ?? '?')}{s.role ? ` · ${ROLE_LABELS[s.role]}` : ''}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</section>
		{/if}
	</div>

	{#if su || (data.rosters.length && !small)}
		<aside class="side">
			{#if su}
				<section class="card signup">
					<h2>Mon inscription</h2>
					{#if su.current}
						<p>
							Inscrit avec <strong>{su.current.name}</strong> ·
							{RAID_HELPER.roles[su.current.category] ? ROLE_LABELS[RAID_HELPER.roles[su.current.category]] : (RAID_HELPER.statuses[su.current.category] ?? su.current.category)}{su.current.spec ? ` (${su.current.spec.replace(/1$/, '')})` : ''}
						</p>
					{:else}
						<p class="muted small">Pas encore inscrit. L'inscription apparaît aussi sur le message Raid-Helper dans Discord.</p>
					{/if}
					{#if form?.signupError}<p class="error">{form.signupError}</p>{/if}
					{#if su.characters.length}
						<form method="POST" action="?/signup" use:enhance={keepValues} class="signup-form">
							<div>
								<label for="characterId">Perso</label>
								<select id="characterId" name="characterId" value={chosen?.id ?? ''} onchange={(e) => (characterId = Number(e.currentTarget.value))}>
									{#each su.characters as c (c.id)}<option value={c.id}>{c.name} · {className(cfg, c.class)}{c.isMain ? ' (main)' : ''}</option>{/each}
								</select>
							</div>
							<div>
								<label for="status">Statut</label>
								<select id="status" name="status" bind:value={status}>
									{#each Object.entries(su.statuses) as [key, label] (key)}<option value={key}>{label}</option>{/each}
								</select>
							</div>
							{#if chosen && chosen.role2 && (status === 'present' || status === 'Bench')}
								<div>
									<label for="slot">Spé</label>
									<select id="slot" name="slot">
										<option value="main">{chosen.spec ? specName(cfg, chosen.class, chosen.spec) : ROLE_LABELS[chosen.role]}</option>
										<option value="second">{chosen.spec2 ? specName(cfg, chosen.class, chosen.spec2) : ROLE_LABELS[chosen.role2]}</option>
									</select>
								</div>
							{/if}
							<button>{su.current ? 'Modifier mon inscription' : 'M’inscrire'}</button>
							{#if su.current}<button class="link quit" formaction="?/cancel" formnovalidate>Me désinscrire</button>{/if}
						</form>
					{:else}
						<p class="muted small">Crée d'abord ta fiche de perso dans <a href="/persos/nouveau">Mes persos</a>.</p>
					{/if}
				</section>
			{/if}

			{#if data.rosters.length && !small}
				<form method="GET" class="compare">
					<label for="roster">Comparer avec un roster</label>
					<select id="roster" name="roster" value={cmp?.id ?? ''} onchange={submit}>
						<option value="">Aucun</option>
						{#each data.rosters as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
					</select>
					<noscript><button>Comparer</button></noscript>
				</form>
			{/if}
		</aside>
	{/if}
</div>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-weight: 500;
		text-decoration: none;
	}
	.head {
		padding-block: 1.25rem 2.5rem;
	}
	.cover {
		display: block;
		width: 100%;
		max-height: 16rem;
		margin-bottom: 1.5rem;
		object-fit: cover;
		border-radius: var(--radius);
	}
	.head-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem 1.5rem;
	}
	.head h1 {
		margin-top: 0.375rem;
	}
	.meta {
		margin: 0.75rem 0 0;
		font-size: 1.0625rem;
	}
	.meta::first-letter {
		text-transform: uppercase;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.head .notice {
		margin: 1.25rem 0 0;
	}
	.edit {
		margin-bottom: 2.5rem;
	}
	.edit summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}
	.edit-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.75rem 1rem;
		margin-top: 1rem;
	}
	.edit-form .wide {
		grid-column: 1 / -1;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 21rem;
		gap: 4rem;
		align-items: start;
	}
	.layout.solo {
		grid-template-columns: minmax(0, 1fr);
	}
	.summary {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin-bottom: 1.5rem;
	}
	.filled {
		font-size: 3.5rem;
		line-height: 1;
	}
	.filled small {
		font-size: 1.5rem;
		color: var(--muted);
	}
	.summary p {
		margin: 0.25rem 0 0;
	}
	.mark {
		display: inline-flex;
	}
	.strip {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
		margin-bottom: 2.5rem;
		padding-block: 1rem;
		border-block: 1px solid var(--border);
		font-size: 0.9375rem;
	}
	.slot,
	.cover-class {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.slot strong,
	.cover-class strong {
		font-weight: 600;
	}
	.slot:not(.done) strong {
		color: var(--warn);
	}
	.cover-class.none {
		color: var(--warn);
	}
	.strip-note {
		margin-left: auto;
		color: var(--warn);
	}
	.strip-note.ok {
		color: var(--good);
	}
	.roles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2.5rem 3rem;
	}
	.roles h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.625rem;
		font-size: 1.25rem;
	}
	.backup {
		margin-left: auto;
		font-family: var(--font-body);
		font-size: 0.8125rem;
		font-weight: 500;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.roles li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.625rem;
		border-top: 1px solid var(--border);
	}
	.roles li .dot {
		width: 12px;
		height: 12px;
	}
	.pos {
		min-width: 1.25rem;
		font-size: 0.8125rem;
		text-align: right;
	}
	.who {
		flex: 1;
		display: grid;
		min-width: 0;
		line-height: 1.35;
	}
	.who strong {
		font-weight: 600;
	}
	.site {
		white-space: nowrap;
		text-decoration: none;
	}
	.flag {
		color: var(--warn);
	}
	.flag a {
		color: inherit;
	}
	.none {
		padding-block: 0.75rem;
	}
	.bench {
		margin: 0.25rem 0 0;
		padding-top: 0.625rem;
		border-top: 1px dashed var(--border);
	}
	.others {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem 4rem;
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}
	.others p {
		margin: 0;
	}
	.compare-res {
		display: grid;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
	}
	.compare-res h2 {
		margin: 0;
	}
	.compare-res p {
		margin: 0;
	}
	.cmp-roles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 1rem;
	}
	.cmp-roles div {
		display: grid;
		gap: 0.25rem;
	}
	.cmp-roles span {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}
	.cmp-roles strong {
		font-size: 1.75rem;
		line-height: 1;
	}
	.cmp-roles .short strong {
		color: var(--warn);
	}
	.cmp-lists {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1.5rem;
	}
	.cmp-lists h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	.cmp-lists ul {
		display: grid;
		gap: 0.375rem;
		font-size: 0.9375rem;
	}
	.side {
		position: sticky;
		top: 96px;
		display: grid;
		gap: 2rem;
	}
	.signup {
		display: grid;
		gap: 0.75rem;
	}
	.signup h2 {
		margin: 0;
		font-size: 1.25rem;
	}
	.signup p {
		margin: 0;
	}
	.signup-form {
		display: grid;
		gap: 0.75rem;
	}
	.quit {
		justify-self: center;
		color: var(--muted);
		font-size: 0.875rem;
	}
	.compare {
		padding-inline: 1.5rem;
	}
	@media (max-width: 960px) {
		.layout {
			display: flex;
			flex-direction: column-reverse;
			gap: 2rem;
			align-items: stretch;
		}
		.side {
			position: static;
		}
		.compare {
			padding-inline: 0;
		}
	}
	@media (max-width: 640px) {
		.roles {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.head {
			padding-bottom: 1.5rem;
		}
		.strip-note {
			margin-left: 0;
		}
	}
</style>
