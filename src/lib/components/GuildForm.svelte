<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { CLASSES, GUILD_FACTION_LABELS, SERVER_TYPE_INFO, type GuildFaction } from '$lib/game/forever';
	import { AMBITIONS, AMBITION_LABELS, DEFAULT_ACCENTS } from '$lib/guild';
	import { ROLES, ROLE_LABELS } from '$lib/roles';

	interface Values {
		name?: string;
		faction?: string;
		serverType?: string | null;
		tagline?: string;
		description?: string;
		ambitions?: string[];
		schedule?: string;
		recruitment?: { open: boolean; classes: string[]; roles: string[]; text: string };
		accentColor?: string;
		timezone?: string;
		discordInvite?: string;
		publicStats?: boolean;
		bannerTitle?: boolean;
		logo?: string | null;
		banner?: string | null;
	}

	let {
		values = {},
		errors = {},
		submitLabel,
		timezones,
		action
	}: { values?: Values; errors?: Record<string, string>; submitLabel: string; timezones: string[]; action?: string } = $props();

	const initial = untrack(() => values);
	let faction = $state(initial.faction ?? '');
	let accent = $state(initial.accentColor ?? DEFAULT_ACCENTS.both);
	let recruiting = $state(initial.recruitment?.open ?? false);

	// Tant que la couleur est celle par défaut d'une faction, elle suit la faction choisie.
	function onFactionChange() {
		if (Object.values(DEFAULT_ACCENTS).includes(accent as never)) accent = DEFAULT_ACCENTS[faction as GuildFaction];
	}
</script>

<form method="POST" {action} enctype="multipart/form-data" use:enhance class="card form">
	{#if errors.form}<p class="error">{errors.form}</p>{/if}

	<fieldset>
		<legend>Identité</legend>
		<div class="grid">
			<div>
				<label for="name">Nom de la guilde *</label>
				<input id="name" name="name" required minlength="2" maxlength="60" value={initial.name ?? ''} />
				{#if errors.name}<p class="error">{errors.name}</p>{/if}
			</div>
			<div>
				<label for="tagline">Devise ou accroche</label>
				<input id="tagline" name="tagline" maxlength="140" value={initial.tagline ?? ''} />
			</div>
		</div>
		<div class="factions">
			<span class="label">Faction *</span>
			{#each Object.entries(GUILD_FACTION_LABELS) as [id, label] (id)}
				<label class="choice">
					<input type="radio" name="faction" value={id} required bind:group={faction} onchange={onFactionChange} />
					{label}
				</label>
			{/each}
			{#if errors.faction}<p class="error">{errors.faction}</p>{/if}
		</div>
		<div class="factions">
			<span class="label">Type de serveur *</span>
			{#each Object.entries(SERVER_TYPE_INFO) as [id, info] (id)}
				<label class="choice" title={info.name}>
					<input type="radio" name="serverType" value={id} required checked={initial.serverType === id} />
					{info.label} <span class="muted small">({info.name}{info.upcoming ? ', pas encore ouvert' : ''})</span>
				</label>
			{/each}
			{#if errors.serverType}<p class="error">{errors.serverType}</p>{/if}
		</div>
		<div class="grid">
			<div>
				<label for="logo">Logo carré (PNG, JPEG ou WebP, 1 Mo max)</label>
				<p class="hint muted">Au moins 600 × 600 px, fond transparent de préférence : il s'affiche en grand sur l'accueil.</p>
				<input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
				{#if errors.logo}<p class="error">{errors.logo}</p>{/if}
				{#if initial.logo}
					<div class="current">
						<img class="logo" src="/logo?v={initial.logo}" alt="Logo actuel" />
						<label class="choice"><input type="checkbox" name="remove-logo" /> Supprimer</label>
					</div>
				{/if}
			</div>
			<div>
				<label for="banner">Bannière (PNG, JPEG ou WebP, 4 Mo max)</label>
				<p class="hint muted">
					Grande image de fond de l'accueil : au moins 2400 × 1000 px, idéalement 3000 × 1300 px. Garde le sujet au centre :
					les bords sont recadrés selon l'écran, et un téléphone n'en montre que le milieu.
				</p>
				<input id="banner" name="banner" type="file" accept="image/png,image/jpeg,image/webp" />
				{#if errors.banner}<p class="error">{errors.banner}</p>{/if}
				{#if initial.banner}
					<div class="current">
						<img class="banner" src="/banniere?v={initial.banner}" alt="Bannière actuelle" />
						<label class="choice"><input type="checkbox" name="remove-banner" /> Supprimer</label>
					</div>
				{/if}
				<label class="choice">
					<input type="checkbox" name="bannerTitle" checked={initial.bannerTitle ?? true} />
					Afficher le logo et le nom par-dessus (décocher si la bannière les contient déjà)
				</label>
			</div>
		</div>
		<div class="grid">
			<div>
				<label for="accentColor">Couleur d'accent</label>
				<input id="accentColor" name="accentColor" type="color" bind:value={accent} />
				{#if errors.accentColor}<p class="error">{errors.accentColor}</p>{/if}
			</div>
			<div>
				<label for="timezone">Fuseau horaire</label>
				<select id="timezone" name="timezone" value={initial.timezone ?? 'Europe/Paris'}>
					{#each timezones as tz (tz)}<option value={tz}>{tz}</option>{/each}
				</select>
			</div>
		</div>
	</fieldset>

	<fieldset>
		<legend>Présentation</legend>
		<div>
			<label for="description">Qui sommes-nous ?</label>
			<textarea id="description" name="description" rows="8" maxlength="5000">{initial.description ?? ''}</textarea>
			<p class="hint muted">Mise en forme : **gras**, *italique*, « - » en début de ligne pour une liste, une ligne vide pour changer de paragraphe.</p>
		</div>
		<div>
			<span class="label">Ambitions</span>
			<div class="checks">
				{#each AMBITIONS as a (a)}
					<label class="choice">
						<input type="checkbox" name="ambitions" value={a} checked={initial.ambitions?.includes(a)} />
						{AMBITION_LABELS[a]}
					</label>
				{/each}
			</div>
		</div>
		<div>
			<label for="schedule">Horaires et rythme de jeu</label>
			<textarea id="schedule" name="schedule" rows="3" maxlength="1000" placeholder="Raids le mercredi et le dimanche, 21 h – 23 h30…"
				>{initial.schedule ?? ''}</textarea
			>
		</div>
	</fieldset>

	<fieldset>
		<legend>Page d'accueil publique</legend>
		<div>
			<label for="discordInvite">Lien d'invitation Discord</label>
			<input id="discordInvite" name="discordInvite" type="url" placeholder="https://discord.gg/…" value={initial.discordInvite ?? ''} />
			{#if errors.discordInvite}<p class="error">{errors.discordInvite}</p>{/if}
		</div>
		<label class="choice">
			<input type="checkbox" name="publicStats" checked={initial.publicStats ?? true} />
			Afficher les chiffres de la guilde aux visiteurs (nombre de joueurs, répartition par rôle et par classe, sans aucun nom)
		</label>
	</fieldset>

	<fieldset>
		<legend>Recrutement</legend>
		<label class="choice"><input type="checkbox" name="recruitmentOpen" bind:checked={recruiting} /> Recrutement ouvert</label>
		<!-- Masqué mais envoyé quand le recrutement est fermé : les choix sont conservés. -->
		<div class="recruitment" hidden={!recruiting}>
			<div>
				<span class="label">Classes recherchées</span>
				<div class="checks">
					{#each CLASSES as c (c.id)}
						<label class="choice">
							<input type="checkbox" name="recruitmentClasses" value={c.id} checked={initial.recruitment?.classes.includes(c.id)} /> <span class="dot" style:--c={c.color}></span> {c.name}
						</label>
					{/each}
				</div>
			</div>
			<div>
				<span class="label">Rôles recherchés</span>
				<div class="checks">
					{#each ROLES as r (r)}
						<label class="choice">
							<input type="checkbox" name="recruitmentRoles" value={r} checked={initial.recruitment?.roles.includes(r)} />
							{ROLE_LABELS[r]}
						</label>
					{/each}
				</div>
			</div>
			<div>
				<label for="recruitmentText">Précisions</label>
				<textarea id="recruitmentText" name="recruitmentText" rows="3" maxlength="2000">{initial.recruitment?.text ?? ''}</textarea>
			</div>
		</div>
	</fieldset>

	<div class="row">
		<button>{submitLabel}</button>
	</div>
</form>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	fieldset:first-of-type {
		padding-top: 0.5rem;
		border-top: 0;
	}
	/* Sections séparées par un filet, sans cadre. */
	fieldset {
		padding-block: 1.5rem;
		border-top: 1px solid var(--border);
		display: grid;
		gap: 0.9rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 1rem;
	}
	.recruitment {
		display: grid;
		gap: 0.9rem;
	}
	.recruitment[hidden] {
		display: none;
	}
	.label {
		display: block;
		font-size: 0.9rem;
		color: var(--muted);
		margin-bottom: 0.3rem;
	}
	.factions,
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.25rem;
		align-items: center;
	}
	.small {
		font-size: 0.82rem;
	}
	.factions .label {
		width: 100%;
	}
	.choice {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text);
		font-size: 0.95rem;
	}
	input[type='color'] {
		height: 2.4rem;
		padding: 0.2rem;
	}
	.hint {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
	}
	.current {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.current img {
		object-fit: cover;
		border-radius: 6px;
		background: var(--surface-2);
	}
	.current .logo {
		width: 48px;
		height: 48px;
		object-fit: contain;
	}
	.current .banner {
		width: 144px;
		height: 60px;
		object-fit: cover;
	}
</style>
