<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { ROLES, ROLE_LABELS, type Role } from '$lib/roles';
	import { FACTIONS, FACTION_LABELS, MAX_PRIMARY_PROFESSIONS, MAX_PROFESSION_LEVEL } from '$lib/game/forever';
	import { AXIS_LABELS, INTEREST_AXES, INTEREST_LEVELS, LEVEL_LABELS } from '$lib/interests';
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
	const levelOf = (id: string) => initial.professions?.find((p) => p.id === id)?.level ?? 1;
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

	function onClassChange() {
		if (!specs.some((s) => s.id === spec)) spec = '';
		if (!specs.some((s) => s.id === spec2)) spec2 = '';
		role = fitRole(spec, role);
		if (role2) role2 = fitRole(spec2, role2);
	}
</script>

<form method="POST" {action} use:enhance class="card form">
	{#if errors.form}<p class="error">{errors.form}</p>{/if}

	<div class="grid">
		<div>
			<label for="name">Nom du perso *</label>
			<input id="name" name="name" required minlength="2" maxlength="24" value={initial.name ?? ''} />
			{#if errors.name}<p class="error">{errors.name}</p>{/if}
		</div>
		<div>
			<label for="surname">Nom de famille *</label>
			<input id="surname" name="surname" required minlength="2" maxlength="24" value={initial.surname ?? ''} />
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
					Reroll de <strong>{mainName}</strong> — en faire le main
				</label>
			{/if}
		</div>
	</div>

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
				<label for="role">Rôle *</label>
				<select id="role" name="role" required bind:value={role}>
					<option value="" disabled>Choisir…</option>
					{#each rolesFor(spec) as r (r)}<option value={r}>{ROLE_LABELS[r]}</option>{/each}
				</select>
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
				<label for="role2">Rôle</label>
				<select id="role2" name="role2" bind:value={role2}>
					<option value="">Aucun</option>
					{#each rolesFor(spec2) as r (r)}<option value={r}>{ROLE_LABELS[r]}</option>{/each}
				</select>
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
								value={levelOf(p.id)}
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

	<div>
		<label for="notes">Notes</label>
		<textarea id="notes" name="notes" rows="3" maxlength="500">{initial.notes ?? ''}</textarea>
	</div>

	{@render extra?.()}

	<div class="row">
		<button>{submitLabel}</button>
		{#if cancelHref}<a class="button secondary" href={cancelHref}>Annuler</a>{/if}
	</div>
</form>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 1rem;
	}
	.check {
		display: flex;
		align-items: end;
	}
	.check label {
		color: var(--text);
	}
	fieldset {
		border: 1px solid var(--border);
		border-radius: 6px;
		display: grid;
		gap: 0.75rem;
		align-content: start;
	}
	.specs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}
	fieldset:disabled {
		opacity: 0.55;
	}
	.small {
		margin: 0;
		font-size: 0.85rem;
	}
	legend {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.professions {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.4rem 1rem;
	}
	.profession {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 2.2rem;
	}
	.profession label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text);
	}
	.profession:not(.checked) label:has(input:disabled) {
		opacity: 0.45;
	}
	.level {
		width: 4.5rem;
		padding: 0.25rem 0.4rem;
	}
	.interests {
		display: grid;
		gap: 0.6rem;
	}
	.axis {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.axis-name {
		width: 3rem;
		font-weight: 700;
	}
	/* Choix en pastilles : le bouton radio est masqué, la pastille sélectionnée s'allume. */
	.pill input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.pill span {
		display: inline-block;
		padding: 0.3rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--muted);
		cursor: pointer;
	}
	.pill input:checked + span {
		color: var(--text);
		border-color: var(--text);
		background: var(--surface-2);
	}
	.pill.casual input:checked + span {
		border-color: #3fb950;
		color: #56d364;
	}
	.pill.competitive input:checked + span {
		border-color: var(--accent);
		color: color-mix(in srgb, var(--accent) 40%, white);
		background: color-mix(in srgb, var(--accent) 18%, transparent);
	}
	.pill input:focus-visible + span {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}
</style>
