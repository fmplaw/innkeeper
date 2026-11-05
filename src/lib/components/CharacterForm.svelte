<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import Glyph from '$lib/components/Glyph.svelte';
	import { ROLES, ROLE_ICONS, ROLE_LABELS, type Role } from '$lib/roles';
	import { FACTIONS, FACTION_LABELS, MAX_PRIMARY_PROFESSIONS, MAX_PROFESSION_LEVEL } from '$lib/game/forever';
	import { AXIS_LABELS, INTEREST_AXES, INTEREST_LEVELS, LEVEL_LABELS } from '$lib/interests';
	import type { ArmoryLookup } from '$lib/server/battlenet';
	import type { PublicConfig } from '$lib/server/config';

	interface Values {
		name?: string;
		surname?: string | null;
		race?: string | null;
		class?: string;
		spec?: string | null;
		role?: string;
		spec2?: string | null;
		role2?: string | null;
		isMain?: boolean;
		level?: number | string;
		professions?: { id: string; level: number | null }[];
		recipes?: string | null;
		pve?: string | null;
		pvp?: string | null;
		notes?: string | null;
		declaredNew?: boolean;
	}

	let {
		config,
		values = {},
		errors = {},
		action = '',
		submitLabel,
		cancelHref = '/persos',
		mainStatus = null,
		mainName = null,
		extra
	}: {
		config: PublicConfig;
		values?: Values;
		errors?: Record<string, string>;
		action?: string;
		submitLabel: string;
		// Lien « Annuler » ; null pour ne pas l'afficher (candidature).
		cancelHref?: string | null;
		// first : premier perso, main d'office ; current : c'est le main ;
		// reroll : rattaché au main `mainName`, peut être promu ; null : sans objet (candidature).
		mainStatus?: 'first' | 'current' | 'reroll' | null;
		mainName?: string | null;
		// Champs supplémentaires avant le bouton (questions de candidature).
		extra?: Snippet;
	} = $props();

	// Valeurs initiales seulement : le formulaire est remonté à chaque navigation.
	const initial = untrack(() => values);
	let name = $state(initial.name ?? '');
	let surname = $state(initial.surname ?? '');
	let race = $state(initial.race ?? '');
	let cls = $state(initial.class ?? '');
	// Nouveau perso : niveau 1 par défaut.
	let level = $state(Number(initial.level ?? 1));
	let spec = $state(initial.spec ?? '');
	let role = $state(initial.role ?? '');
	let spec2 = $state(initial.spec2 ?? '');
	let role2 = $state(initial.role2 ?? '');

	// Métiers cochés : au-delà de 2 métiers principaux, les autres principaux se grisent.
	let chosen = $state<string[]>(initial.professions?.map((p) => p.id) ?? []);
	// Un métier coché démarre au niveau 1.
	let professionLevels = $state<Record<string, number>>(
		untrack(() => Object.fromEntries(config.professions.map((p) => [p.id, initial.professions?.find((x) => x.id === p.id)?.level ?? 1])))
	);
	const primaryCount = $derived(chosen.filter((id) => !config.professions.find((p) => p.id === id)?.secondary).length);

	const raceClasses = $derived(config.races.find((r) => r.id === race)?.classes);
	const classes = $derived(raceClasses ? config.classes.filter((c) => raceClasses.includes(c.id)) : config.classes);
	const specs = $derived(config.classes.find((c) => c.id === cls)?.specs ?? []);
	const dualSpecOpen = $derived(level >= config.dualSpecLevel);

	function rolesFor(specId: string): readonly Role[] {
		const selected = specs.find((s) => s.id === specId);
		if (selected) return selected.roles;
		const fromClass = new Set(specs.flatMap((s) => s.roles));
		return fromClass.size ? ROLES.filter((r) => fromClass.has(r)) : ROLES;
	}

	// Ajuste le rôle quand la spé change : rôle unique imposé, rôle devenu invalide vidé.
	function fitRole(specId: string, current: string) {
		const allowed = rolesFor(specId);
		if (allowed.length === 1) return allowed[0];
		return allowed.includes(current as Role) ? current : '';
	}

	function onRaceChange() {
		if (cls && !classes.some((c) => c.id === cls)) {
			cls = '';
			onClassChange();
		}
	}

	// Vérification dans l'Armurerie de Blizzard, quand la guilde a connecté Battle.net : dès que le
	// prénom et le nom de famille sont tapés (avec un court délai), le site cherche le perso.
	let armory = $state<ArmoryLookup | null>(null);
	let checking = $state(false);
	let declaredNew = $state(initial.declaredNew ?? false);
	$effect(() => {
		const first = name.trim();
		const last = surname.trim();
		if (!config.armory || first.length < 2 || last.length < 2) {
			armory = null;
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			checking = true;
			try {
				const res = await fetch(`/api/armurerie?prenom=${encodeURIComponent(first)}&nom=${encodeURIComponent(last)}`, { signal: controller.signal });
				armory = res.ok ? ((await res.json()) as ArmoryLookup) : null;
			} catch {
				// Recherche annulée (nouvelle frappe) ou réseau : rien à afficher.
			} finally {
				checking = false;
			}
		}, 600);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
	const found = $derived(armory?.status === 'found' ? armory : null);
	const nameOf = (list: readonly { id: string; name: string }[], id: string | null) => list.find((x) => x.id === id)?.name ?? id ?? '?';
	const differences = $derived.by(() => {
		if (!found) return [];
		const list: string[] = [];
		if (found.classId && cls && cls !== found.classId) list.push(`classe ${nameOf(config.classes, found.classId)} en jeu`);
		if (found.raceId && race && race !== found.raceId) list.push(`race ${nameOf(config.races, found.raceId)} en jeu`);
		return list;
	});

	/** Remplit race, classe, niveau et métiers avec ceux de l'Armurerie. */
	function fillFromArmory() {
		if (!found) return;
		if (found.raceId && config.races.some((r) => r.id === found.raceId)) race = found.raceId;
		if (found.classId) {
			cls = found.classId;
			onClassChange();
		}
		level = Math.min(found.level, config.maxLevel);
		if (found.professions.length) {
			chosen = found.professions.map((p) => p.id);
			for (const p of found.professions) professionLevels[p.id] = p.level ?? 1;
		}
		declaredNew = false;
	}

	function onClassChange() {
		if (!specs.some((s) => s.id === spec)) spec = '';
		if (!specs.some((s) => s.id === spec2)) spec2 = '';
		role = fitRole(spec, role);
		if (role2) role2 = fitRole(spec2, role2);
	}
</script>

<form method="POST" {action} use:enhance class="card form">
	{#if errors.form}<p class="error">{errors.form}</p>{/if}

	<fieldset>
	<legend>Le perso</legend>
	<div class="grid">
		<div>
			<label for="name">Nom du perso *</label>
			<input id="name" name="name" required minlength="2" maxlength="24" bind:value={name} />
			{#if errors.name}<p class="error">{errors.name}</p>{/if}
		</div>
		<div>
			<label for="surname">Nom de famille *</label>
			<input id="surname" name="surname" required minlength="2" maxlength="24" bind:value={surname} />
			{#if errors.surname}<p class="error">{errors.surname}</p>{/if}
		</div>
		<div>
			<label for="race">Race *</label>
			<select id="race" name="race" required bind:value={race} onchange={onRaceChange}>
				<option value="" disabled>Choisir…</option>
				{#if config.guild.faction === 'both'}
					{#each FACTIONS as f (f)}
						<optgroup label={FACTION_LABELS[f]}>
							{#each config.races.filter((r) => r.faction === f) as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
						</optgroup>
					{/each}
				{:else}
					{#each config.races as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
				{/if}
			</select>
			{#if errors.race}<p class="error">{errors.race}</p>{/if}
		</div>
		<div>
			<label for="level">Niveau *</label>
			<input id="level" name="level" type="number" min="1" max={config.maxLevel} required bind:value={level} />
			{#if errors.level}<p class="error">{errors.level}</p>{/if}
		</div>
		<div>
			<label for="class">Classe *</label>
			<select id="class" name="class" required bind:value={cls} onchange={onClassChange}>
				<option value="" disabled>Choisir…</option>
				{#each classes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
			</select>
			{#if errors.class}<p class="error">{errors.class}</p>{/if}
		</div>
		<div class="check">
			{#if mainStatus === null}
				<!-- Candidature : pas de notion de main. -->
			{:else if mainStatus === 'first'}
				<p class="muted">Premier perso : il devient automatiquement le main.</p>
			{:else if mainStatus === 'current'}
				<p class="muted">
					<span class="badge main">Main</span> Pour changer de main, promeus un reroll.
				</p>
			{:else}
				<label>
					<input type="checkbox" name="isMain" checked={initial.isMain ?? false} />
					<span>Reroll de <strong>{mainName}</strong> — en faire le main</span>
				</label>
			{/if}
		</div>
	</div>
	{#if config.armory}
		<div class="armory" aria-live="polite">
			{#if checking && !armory}
				<p class="muted small">Recherche dans l'Armurerie…</p>
			{:else if found}
				<p class="found">
					<span>
						✔ Trouvé dans l'Armurerie : {nameOf(config.races, found.raceId)} · {nameOf(config.classes, found.classId)} · niveau
						{found.level}{found.guild ? ` · ${found.guild}` : ''}
					</span>
					<button type="button" class="secondary small-button" onclick={fillFromArmory}>Remplir avec ces infos</button>
				</p>
				{#if differences.length}
					<p class="warn small">⚠ Ta saisie ne correspond pas au jeu : {differences.join(', ')}.</p>
				{/if}
			{:else if armory?.status === 'missing'}
				<p class="warn small">
					Introuvable dans l'Armurerie. Vérifie l'orthographe exacte du prénom et du nom de famille. L'Armurerie ne
					connaît que les persos qui se sont déconnectés du jeu récemment.
				</p>
			{/if}
			{#if armory?.status === 'missing' || declaredNew}
				<label class="new">
					<input type="checkbox" name="declaredNew" bind:checked={declaredNew} />
					<span>Ce perso n'existe pas encore en jeu : je vais le créer</span>
				</label>
			{/if}
		</div>
	{:else if declaredNew}
		<input type="hidden" name="declaredNew" value="on" />
	{/if}
	</fieldset>

	<div class="specs">
		<fieldset>
			<legend>Spé principale</legend>
			<div>
				<label for="spec">Spécialisation</label>
				<select id="spec" name="spec" bind:value={spec} onchange={() => (role = fitRole(spec, role))}>
					<option value="">—</option>
					{#each specs as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
				</select>
				{#if errors.spec}<p class="error">{errors.spec}</p>{/if}
			</div>
			<div>
				<span class="label" id="role-label">Rôle *</span>
				<div class="roles" role="radiogroup" aria-labelledby="role-label">
					{#each rolesFor(spec) as r (r)}
						<label class="pill role-pill">
							<input type="radio" name="role" value={r} required bind:group={role} />
							<span><span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={15} /></span>{ROLE_LABELS[r]}</span>
						</label>
					{/each}
				</div>
				{#if errors.role}<p class="error">{errors.role}</p>{/if}
			</div>
		</fieldset>

		<fieldset disabled={!dualSpecOpen && !spec2 && !role2}>
			<legend>Spé secondaire</legend>
			{#if !dualSpecOpen}
				<p class="muted small">Se débloque au niveau {config.dualSpecLevel}.</p>
			{/if}
			<div>
				<label for="spec2">Spécialisation</label>
				<select id="spec2" name="spec2" bind:value={spec2} onchange={() => (role2 = fitRole(spec2, role2))}>
					<option value="">Aucune</option>
					{#each specs as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
				</select>
				{#if errors.spec2}<p class="error">{errors.spec2}</p>{/if}
			</div>
			<div>
				<span class="label" id="role2-label">Rôle</span>
				<div class="roles" role="radiogroup" aria-labelledby="role2-label">
					<label class="pill">
						<input type="radio" name="role2" value="" bind:group={role2} />
						<span>Aucun</span>
					</label>
					{#each rolesFor(spec2) as r (r)}
						<label class="pill role-pill">
							<input type="radio" name="role2" value={r} bind:group={role2} />
							<span><span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={15} /></span>{ROLE_LABELS[r]}</span>
						</label>
					{/each}
				</div>
				{#if errors.role2}<p class="error">{errors.role2}</p>{/if}
			</div>
		</fieldset>
	</div>

	<fieldset>
		<legend>Ce qui m'intéresse sur ce perso</legend>
		<p class="muted small">Modifiable à tout moment, selon tes envies du moment.</p>
		<div class="interests">
			{#each INTEREST_AXES as axis (axis)}
				<div class="axis" role="radiogroup" aria-label={AXIS_LABELS[axis]}>
					<span class="axis-name">{AXIS_LABELS[axis]}</span>
					<label class="pill">
						<input type="radio" name={axis} value="" checked={!initial[axis]} />
						<span>Pas intéressé</span>
					</label>
					{#each INTEREST_LEVELS as level (level)}
						<label class="pill {level}">
							<input type="radio" name={axis} value={level} checked={initial[axis] === level} />
							<span>{LEVEL_LABELS[level]}</span>
						</label>
					{/each}
				</div>
			{/each}
		</div>
	</fieldset>

	<fieldset>
		<legend>Métiers</legend>
		<p class="muted small">
			{MAX_PRIMARY_PROFESSIONS} métiers principaux au maximum. Niveau de 1 à {MAX_PROFESSION_LEVEL}, 1 par défaut.
		</p>
		{#each [false, true] as secondary (secondary)}
			<div class="professions">
				{#each config.professions.filter((p) => p.secondary === secondary) as p (p.id)}
					{@const checked = chosen.includes(p.id)}
					<div class="profession" class:checked>
						<label>
							<input
								type="checkbox"
								name="professions"
								value={p.id}
								bind:group={chosen}
								disabled={!checked && !p.secondary && primaryCount >= MAX_PRIMARY_PROFESSIONS}
							/>
							{p.name}
						</label>
						{#if checked}
							<input
								class="level"
								type="number"
								name="level-{p.id}"
								min="1"
								max={MAX_PROFESSION_LEVEL}
								placeholder="Niv."
								aria-label="Niveau en {p.name}"
								bind:value={professionLevels[p.id]}
							/>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
		{#if errors.professions}<p class="error">{errors.professions}</p>{/if}
		<div>
			<label for="recipes">Recettes ou spécialités notables</label>
			<input id="recipes" name="recipes" maxlength="500" placeholder="Flacons, Ingénierie gobeline, cape Onyxia…" value={initial.recipes ?? ''} />
		</div>
	</fieldset>

	<fieldset>
		<legend>Notes</legend>
		<textarea id="notes" name="notes" rows="3" maxlength="500" aria-label="Notes">{initial.notes ?? ''}</textarea>
	</fieldset>

	{@render extra?.()}

	<div class="row">
		<button>{submitLabel}</button>
		{#if cancelHref}<a class="button secondary" href={cancelHref}>Annuler</a>{/if}
	</div>
</form>

<style>
	.form {
		display: grid;
		gap: 0;
		padding: 0.5rem clamp(1.25rem, 3vw, 2rem) 1.75rem;
	}
	/* Sections séparées par un filet, sans cadre. */
	fieldset,
	.specs {
		display: grid;
		gap: 0.875rem;
		align-content: start;
		padding-block: 1.5rem;
		border-top: 1px solid var(--border);
	}
	.form > fieldset:first-of-type {
		border-top: 0;
	}
	.specs fieldset {
		padding: 0;
		border: 0;
	}
	legend {
		float: left;
		width: 100%;
		margin-bottom: 0.25rem;
	}
	legend + * {
		clear: both;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 1rem 1.25rem;
	}
	.armory {
		display: grid;
		gap: 0.5rem;
	}
	.armory p {
		margin: 0;
	}
	.found {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		color: var(--good);
		font-size: 0.9375rem;
	}
	.small-button {
		min-height: 34px;
		padding: 0.25rem 0.875rem;
		font-size: 0.875rem;
	}
	.warn {
		color: var(--warn);
	}
	.new {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		color: var(--text);
		font-weight: 400;
	}
	.check {
		display: flex;
		align-items: end;
	}
	.check p {
		margin: 0 0 0.625rem;
	}
	.check label {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		margin: 0 0 0.625rem;
		color: var(--text);
	}
	.check label input {
		flex: none;
		align-self: center;
	}
	.specs {
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		column-gap: 2.5rem;
	}
	fieldset:disabled {
		opacity: 0.5;
	}
	.small {
		margin: 0;
	}
	.label {
		display: block;
		margin-bottom: 0.375rem;
		color: var(--muted);
		font-size: 0.875rem;
		font-weight: 500;
	}
	.roles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.mark {
		display: inline-flex;
	}
	.professions {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.375rem 0.75rem;
	}
	.professions + .professions {
		padding-top: 0.5rem;
		border-top: 1px dashed var(--border);
	}
	.profession {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 2.75rem;
		padding: 0 0.375rem 0 0.75rem;
		border-radius: 10px;
		transition: background 0.15s;
	}
	.profession.checked {
		background: var(--tint);
	}
	.profession label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 400;
	}
	.profession:not(.checked) label:has(input:disabled) {
		opacity: 0.45;
	}
	.level {
		width: 4.5rem;
		min-height: 34px;
		padding: 0.25rem 0.5rem;
	}
	.interests {
		display: grid;
		gap: 0.625rem;
	}
	.axis {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}
	.axis-name {
		width: 3rem;
		font-weight: 600;
	}
	/* Choix en pastilles : le bouton radio est masqué, la pastille sélectionnée s'allume. */
	.pill {
		margin: 0;
	}
	.pill input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.pill > span {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 36px;
		padding: 0.25rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--muted);
		font-size: 0.9375rem;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}
	.pill > span:hover {
		border-color: var(--border-strong);
		color: var(--text);
	}
	.pill input:checked + span {
		border-color: transparent;
		background: rgb(255 238 220 / 0.13);
		color: var(--text);
	}
	.role-pill input:checked + span {
		background: var(--tint);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.pill.casual input:checked + span {
		background: color-mix(in oklab, var(--good) 13%, var(--bg));
		color: var(--good);
	}
	.pill.competitive input:checked + span {
		background: var(--tint);
		color: var(--accent-ink);
	}
	.pill input:focus-visible + span {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}
	.row {
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}
</style>
