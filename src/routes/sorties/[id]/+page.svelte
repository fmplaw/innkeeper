<script lang="ts">
	import { ROLES, ROLE_LABELS } from '$lib/roles';
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

	function submit(e: Event) {
		(e.currentTarget as HTMLSelectElement).form?.requestSubmit();
	}
</script>

<header class="event">
	{#if data.event.image}<img class="cover" src={data.event.image} alt="" />{/if}
	<h1>{data.event.title}</h1>
	<p class="muted">
		{data.event.when}{#if data.event.leader}{' '}· organisé par {data.event.leader}{/if}
	</p>
	<div class="row">
		<a class="button secondary" href="https://raid-helper.dev/event/{data.event.id}" target="_blank" rel="noopener">
			Voir sur Raid-Helper
		</a>
		<a class="button secondary" href="/sorties/{data.event.id}?actualiser" data-sveltekit-reload title="Relire les inscriptions sur Raid-Helper">Actualiser</a>
		<a href="/sorties" class="muted">Autre sortie</a>
		{#if data.canDelete}
			<form
				method="POST"
				action="?/delete"
				use:enhance
				class="delete"
				onsubmit={(e) => {
					const n = comp.presentCount + comp.benchCount;
					if (!window.confirm(`Supprimer « ${data.event.title} » ? Le message disparaîtra de Discord${n ? ` et les ${n} inscriptions seront perdues` : ''}.`)) e.preventDefault();
				}}
			>
				<button class="danger">Supprimer la sortie</button>
			</form>
		{/if}
	</div>
	{#if form?.deleteError}<p class="error">{form.deleteError}</p>{/if}
	{#if form?.edited}<p class="ok-text">Sortie modifiée, sur le site comme sur Discord.</p>{/if}
</header>

{#if data.edit}
	{@const ev = data.edit.values}
	<details class="card edit" open={Boolean(form?.editError)}>
		<summary>Modifier la sortie</summary>
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

{#if su}
	<section class="card signup">
		<h2>Mon inscription</h2>
		{#if su.current}
			<p>
				Inscrit avec <strong>{su.current.name}</strong> ·
				{RAID_HELPER.roles[su.current.category] ? ROLE_LABELS[RAID_HELPER.roles[su.current.category]] : (RAID_HELPER.statuses[su.current.category] ?? su.current.category)}{su.current.spec ? ` (${su.current.spec.replace(/1$/, '')})` : ''}
			</p>
		{:else}
			<p class="muted">Pas encore inscrit. L'inscription apparaît aussi sur le message Raid-Helper dans Discord.</p>
		{/if}
		{#if form?.signupError}<p class="error">{form.signupError}</p>{/if}
		{#if su.characters.length}
			<form method="POST" action="?/signup" use:enhance={keepValues} class="row signup-form">
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
				{#if su.current}<button class="secondary" formaction="?/cancel" formnovalidate>Me désinscrire</button>{/if}
			</form>
		{:else}
			<p class="muted">Crée d'abord ta fiche de perso dans <a href="/persos/nouveau">Mes persos</a>.</p>
		{/if}
	</section>
{/if}

<p class="summary">
	<strong>{comp.presentCount}</strong>{#if data.event.limit}{' '}/ {data.event.limit} places{:else}{' '}inscrits{/if}
	{#if data.event.limit && comp.presentCount >= data.event.limit}<span class="badge full">Complet</span>{/if}
	{#if comp.benchCount}· <strong>{comp.benchCount}</strong> sur le banc{/if}
	{#if comp.withoutAccount}· <span class="warn">{comp.withoutAccount} sans compte sur le site</span>{/if}
	{#if comp.withoutCharacter}· <span class="warn">{comp.withoutCharacter} sans perso de la classe inscrite</span>{/if}
</p>

{#if data.rosters.length && !small}
	<section class="card compare">
		<form method="GET" class="row">
			<label for="roster">Comparer avec un roster</label>
			<select id="roster" name="roster" value={cmp?.id ?? ''} onchange={submit}>
				<option value="">— Aucun —</option>
				{#each data.rosters as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
			</select>
			<noscript><button>Comparer</button></noscript>
		</form>

		{#if cmp}
			<div class="cmp-roles">
				{#each ROLES as r (r)}
					<div class:short={cmp.signed[r] < cmp.target[r]}>
						<span class="muted">{ROLE_LABELS[r]}</span>
						<strong>{cmp.signed[r]} / {cmp.target[r]}</strong>
					</div>
				{/each}
			</div>
			<p class="muted small">Inscrits du roster / persos prévus dans « {cmp.name} », par rôle.</p>

			<div class="cmp-lists">
				<div>
					<h3>Inscrits du roster <span class="muted">({cmp.registered.length})</span></h3>
					<ul>
						{#each cmp.registered as m (m.id)}
							<li>
								<span style:color={classColor(cfg, m.class)}>{m.name}</span>
								<span class="muted">· {m.player}</span>
								{#if m.otherCharacter}
									<span class="warn">inscrit avec un autre perso ({m.signup.class ? className(cfg, m.signup.class) : m.signup.name})</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<h3>Absents du roster <span class="muted">({cmp.missing.length})</span></h3>
					<ul>
						{#each cmp.missing as m (m.id)}
							<li>
								<span style:color={classColor(cfg, m.class)}>{m.name}</span>
								<span class="muted">· {m.player} · {ROLE_LABELS[m.role]}</span>
								<span class={m.status ? 'muted' : 'warn'}>{m.status ?? 'pas inscrit'}</span>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<h3>Inscrits hors roster <span class="muted">({cmp.outsiders.length})</span></h3>
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
		{/if}
	</section>
{/if}

{#if small}
	<section class="card group">
		<h2>Composition du groupe</h2>
		<div class="slots">
			{#each groupSlots as g (g.label)}
				<span class="slot" class:done={g.have >= g.need}>{g.label} <strong>{g.have}/{g.need}</strong></span>
			{/each}
		</div>
		{#if missing.length}
			<p class="muted">Il manque : {missing.join(', ')}.</p>
		{:else}
			<p class="ok-text">Groupe complet en rôles.</p>
		{/if}
	</section>
{:else}
	<section class="card classes">
		<h2>Par classe</h2>
		<p class="muted legend">Utile pour les buffs de raid : totems, bénédictions, auras…</p>
		<div class="class-grid">
			{#each cfg.classes as c (c.id)}
				{@const n = comp.byClass[c.id] ?? 0}
				<span class="class-count" class:none={!n}><span style:color={c.color}>{c.name}</span> <strong>{n}</strong></span>
			{/each}
		</div>
	</section>
{/if}

<section class="roles">
	{#each ROLES as r (r)}
		<div class="card">
			<h2>
				{ROLE_LABELS[r]} <span class="muted">({comp.byRole[r].length})</span>
				{#if comp.backups[r].length}<span class="backup muted" title="Inscrits d'un autre rôle qui peuvent le tenir (spé secondaire ou reroll)">+{comp.backups[r].length} possible{comp.backups[r].length > 1 ? 's' : ''}</span>{/if}
			</h2>
			{#if comp.byRole[r].length === 0}
				<p class="muted">Personne.</p>
			{/if}
			<ul>
				{#each comp.byRole[r] as s (s.id)}
					<li>
						<div class="who">
							<span class="pos muted">{s.position}</span>
							<strong>{s.name}</strong>
							<span style:color={s.class ? classColor(cfg, s.class) : undefined}>
								{#if s.class}
									{className(cfg, s.class)}{#if s.spec}{' '}· {specName(cfg, s.class, s.spec)}{/if}
								{:else}
									{s.rhSpec ?? '?'}
								{/if}
							</span>
						</div>
						<div class="site">
							{#if !s.player}
								<span class="warn">pas de compte sur le site</span>
							{:else if !s.character}
								<span class="warn">
									<a href="/joueurs/{s.player.id}">{s.player.displayName}</a> : aucun perso {s.class ? className(cfg, s.class) : ''} renseigné
								</span>
							{:else}
								<a class="muted" href="/joueurs/{s.player.id}">→ {fullName(s.character)}</a>
								<span class="badge" class:main={s.character.isMain}>
									{s.character.isMain ? 'Main' : 'Reroll'}
								</span>
								<span class="muted">niv. {s.character.level}</span>
							{/if}
						</div>
						{#if s.otherRoles.length}
							<div class="alt muted">
								Peut aussi :
								{#each s.otherRoles as o, i (o.role)}{i ? ', ' : ''}{ROLE_LABELS[o.role]} ({o.via}){/each}
							</div>
						{/if}
						{#if s.note}<div class="alt muted">« {s.note} »</div>{/if}
					</li>
				{/each}
			</ul>
			{#if comp.bench[r].length}
				<div class="bench">
					<span class="muted">Sur le banc :</span>
					{#each comp.bench[r] as b, i (b.id)}{i ? ', ' : ''}<span style:color={b.class ? classColor(cfg, b.class) : undefined}>{b.name}</span>{#if b.class}{' '}<span class="muted">({specName(cfg, b.class, b.spec) || className(cfg, b.class)})</span>{/if}{/each}
				</div>
			{/if}
		</div>
	{/each}
</section>

{#if comp.statuses.length || comp.unknown.length}
	<section class="card others">
		{#each comp.statuses as g (g.key)}
			<p><strong>{g.label}</strong> ({g.signups.length}) : {g.signups.map((s) => s.name).join(', ')}</p>
		{/each}
		{#if comp.unknown.length}
			<p>
				<strong>Non classés</strong> ({comp.unknown.length}) :
				{comp.unknown.map((s) => `${s.name} (${s.category})`).join(', ')}
			</p>
		{/if}
	</section>
{/if}

<style>
	.edit {
		margin-bottom: 1rem;
	}
	.edit summary {
		cursor: pointer;
		font-weight: 600;
	}
	.edit-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.75rem 1rem;
		margin-top: 0.75rem;
	}
	.edit-form .wide {
		grid-column: 1 / -1;
	}
	.ok-text {
		color: #56d364;
	}
	.group,
	.classes {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.group h2,
	.classes h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.group p,
	.classes p {
		margin: 0;
	}
	.slots,
	.class-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.slot,
	.class-count {
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface-2);
		font-variant-numeric: tabular-nums;
	}
	.slot.done {
		border-color: #3fb950;
	}
	.slot:not(.done) strong {
		color: var(--gold);
	}
	.class-count.none {
		opacity: 0.45;
	}
	.backup {
		font-size: 0.85rem;
		font-weight: 400;
		margin-left: 0.3rem;
	}
	.delete {
		margin-left: auto;
	}
	.full {
		border-color: var(--gold);
		color: var(--gold);
		margin-left: 0.35rem;
	}
	.bench {
		margin-top: 0.6rem;
		padding-top: 0.5rem;
		border-top: 1px dashed var(--border);
		font-size: 0.9rem;
	}
	.cover {
		width: 100%;
		max-height: 14rem;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid var(--border);
	}
	.signup {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.signup h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.signup p {
		margin: 0;
	}
	.signup-form {
		align-items: flex-end;
		flex-wrap: wrap;
	}
	.signup-form > div {
		display: grid;
		gap: 0.25rem;
	}
	.compare {
		display: grid;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}
	.compare form {
		align-items: center;
	}
	.compare select {
		width: auto;
		min-width: 14rem;
	}
	.cmp-roles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 0.6rem;
	}
	.cmp-roles div {
		display: grid;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 6px;
	}
	.cmp-roles strong {
		font-size: 1.3rem;
		font-variant-numeric: tabular-nums;
	}
	.cmp-roles .short {
		border-color: var(--gold);
	}
	.cmp-roles .short strong {
		color: var(--gold);
	}
	.cmp-lists {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem;
	}
	.cmp-lists h3 {
		margin: 0 0 0.4rem;
		font-size: 0.95rem;
	}
	.small {
		margin: 0;
		font-size: 0.85rem;
	}
	.cmp-lists ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.3rem;
		font-size: 0.92rem;
	}
	.event h1 {
		margin-bottom: 0.25rem;
	}
	.summary {
		margin: 1.25rem 0;
	}
	.warn {
		color: var(--gold);
	}
	.roles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}
	h2 {
		margin-top: 0;
		font-size: 1rem;
	}
	.legend {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	li {
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.92rem;
	}
	li:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
	.who {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: baseline;
	}
	.pos {
		min-width: 1.5rem;
		font-variant-numeric: tabular-nums;
	}
	.site,
	.alt {
		margin-left: 1.9rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		font-size: 0.85rem;
	}
	.others p {
		margin: 0.25rem 0;
	}
</style>
