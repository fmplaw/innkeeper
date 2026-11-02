<script lang="ts">
	import Crest from '$lib/components/Crest.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Horizon from '$lib/components/Horizon.svelte';
	import RoleBar from '$lib/components/RoleBar.svelte';
	import { GUILD_FACTION_LABELS } from '$lib/game/forever';
	import { AMBITION_ICONS, AMBITION_LABELS } from '$lib/guild';
	import { richText } from '$lib/format';
	import { ROLE_ICONS, ROLE_LABELS } from '$lib/roles';

	let { data } = $props();
	const cfg = $derived(data.config);
	const guild = $derived(cfg.guild);
	const profile = $derived(data.profile);
	const recruitment = $derived(profile?.recruitment);
	const classById = (id: string) => cfg.classes.find((c) => c.id === id);
	const presentClasses = $derived(cfg.classes.filter((c) => data.stats?.byClass[c.id]));
	const member = $derived(data.user);
	const next = $derived(data.nextOuting);
	const nextDate = $derived(
		new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: data.timezone })
	);
</script>

<section class="hero" class:compact={member}>
	{#if guild.bannerUrl}<img class="ban" src={guild.bannerUrl} alt="" />{:else}<Horizon />{/if}
	<div class="hero-in">
		{#if member}
			<div class="greet">
				<p class="eyebrow">{guild.name}</p>
				<h1>Bon retour, {member.displayName}.</h1>
				<p class="tagline">Tiens ta fiche à jour pour aider les officiers à préparer les sorties.</p>
				<div class="cta">
					<a class="button" href="/persos">Mes persos</a>
					<a class="button secondary" href="/roster">Roster</a>
				</div>
			</div>
			{#if next}
				<a class="card next" href="/sorties/{next.id}">
					<span class="eyebrow">Prochaine sortie · <span class="date">{nextDate.format(next.startTime * 1000)}</span></span>
					<span class="serif next-title">{next.title}</span>
					{#if next.signUpCount !== null}<span class="muted small">{next.signUpCount} inscrit{next.signUpCount > 1 ? 's' : ''}{#if next.leaderName}{' · '}organisé par {next.leaderName}{/if}</span>{/if}
					<span class="next-go">Voir la composition <Glyph name="arrow-right" size={16} /></span>
				</a>
			{:else}
				<a class="card next" href="/sorties">
					<span class="eyebrow">Sorties</span>
					<span class="serif next-title">Rien de prévu pour l'instant</span>
					<span class="next-go">Voir les sorties <Glyph name="arrow-right" size={16} /></span>
				</a>
			{/if}
		{:else}
			{#if guild.bannerTitle && guild.logoUrl}<div class="blazon"><Crest src={guild.logoUrl} size={150} /></div>{/if}
			<div>
				{#if guild.bannerTitle}
					<p class="eyebrow">{GUILD_FACTION_LABELS[guild.faction]} · World of Warcraft Forever</p>
				{/if}
				<!-- Si la bannière contient déjà le nom, le titre reste pour les lecteurs d'écran. -->
				<h1 class:hidden={!guild.bannerTitle}>{guild.name}</h1>
				{#if guild.tagline && guild.bannerTitle}<p class="tagline">{guild.tagline}</p>{/if}
				<div class="cta">
					{#if data.candidate}
						<a class="button" href="/candidature">Ma candidature</a>
					{:else if recruitment?.open}
						<a class="button" href="/postuler">Postuler</a>
					{/if}
					{#if profile?.discordInvite}
						<a class="button secondary" href={profile.discordInvite} target="_blank" rel="noopener"><Glyph name="message" size={17} /> Rejoindre le Discord</a>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>

<div class="wrap">
	{#if recruitment}
		<section class="recruit" aria-label="Recrutement">
			<div>
				{#if recruitment.open}
					<span class="badge good"><Glyph name="check" size={14} /> Recrutement ouvert</span>
				{:else}
					<span class="badge plain">Recrutement fermé pour le moment</span>
				{/if}
				{#if recruitment.open && recruitment.text}
					<div class="prose recruit-text">{@html richText(recruitment.text)}</div>
				{:else if !recruitment.open}
					<p class="recruit-text muted">Tu peux quand même passer nous voir sur Discord.</p>
				{/if}
			</div>
			{#if recruitment.open && recruitment.roles.length}
				<div>
					<p class="muted small">Rôles recherchés</p>
					<div class="chips">
						{#each recruitment.roles as r (r)}
							<span class="badge plain"><span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={14} /></span>{ROLE_LABELS[r]}</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if recruitment.open && recruitment.classes.length}
				<div>
					<p class="muted small">Classes recherchées</p>
					<div class="chips">
						{#each recruitment.classes as id (id)}
							{@const c = classById(id)}
							{#if c}<span class="badge plain"><span class="dot" style:--c={c.color}></span>{c.name}</span>{/if}
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	{#if profile?.description || profile?.schedule || profile?.ambitions.length}
		<section class="story">
			{#if profile?.description}
				<div class="prose lead">
					<h2>Qui sommes-nous ?</h2>
					{@html richText(profile.description)}
				</div>
			{/if}
			<aside class="facts">
				{#if profile?.schedule}
					<h3>Horaires et rythme</h3>
					<div class="prose">{@html richText(profile.schedule)}</div>
				{/if}
				{#if profile?.ambitions.length}
					<h3>Ce qui nous anime</h3>
					<ul>
						{#each profile.ambitions as a (a)}
							<li><span class="ic"><Glyph name={AMBITION_ICONS[a]} size={18} /></span>{AMBITION_LABELS[a]}</li>
						{/each}
					</ul>
				{/if}
			</aside>
		</section>
	{/if}

	{#if data.stats}
		<section class="figures">
			<h2>La guilde en chiffres</h2>
			<div class="figures-grid">
				<div class="big"><strong class="serif num">{data.stats.players}</strong><span class="muted">joueurs inscrits</span></div>
				<div class="big"><strong class="serif num">{data.stats.characters}</strong><span class="muted">personnages</span></div>
				{#if data.stats.mains}
					<div class="roles">
						<p class="muted small">Rôles des mains</p>
						<RoleBar counts={data.stats.byRole} />
					</div>
				{/if}
			</div>
			{#if presentClasses.length}
				<div class="classes">
					{#each presentClasses as c (c.id)}
						<span class="badge plain"><span class="dot" style:--c={c.color}></span>{c.name} <strong class="num">{data.stats.byClass[c.id]}</strong></span>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.wrap {
		width: min(1160px, 100%);
		margin-inline: auto;
		padding-inline: 2rem;
	}
	/* Hauteur liée à la largeur : la bannière garde à peu près sa taille réelle au lieu d'être agrandie. */
	.hero {
		position: relative;
		height: clamp(560px, 44vw, 780px);
		overflow: hidden;
	}
	.hero.compact {
		height: 520px;
		min-height: 0;
	}
	.ban {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 62% 30%;
	}
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, rgb(10 5 3 / 0.72), transparent 17%),
			linear-gradient(to top, var(--bg) 0, color-mix(in srgb, var(--bg) 78%, transparent) 26%, transparent 58%),
			linear-gradient(to right, color-mix(in srgb, var(--bg) 70%, transparent), transparent 60%);
	}
	.hero.compact::after {
		background:
			linear-gradient(to bottom, rgb(10 5 3 / 0.72), transparent 24%),
			linear-gradient(to top, var(--bg) 0, color-mix(in srgb, var(--bg) 82%, transparent) 42%, transparent 82%),
			linear-gradient(to right, color-mix(in srgb, var(--bg) 78%, transparent), transparent 70%);
	}
	.hero-in {
		position: absolute;
		z-index: 2;
		inset: auto 0 2.5rem;
		width: min(1160px, 100%);
		margin-inline: auto;
		padding-inline: 2rem;
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.compact .hero-in {
		align-items: flex-end;
		justify-content: space-between;
	}
	.blazon {
		flex: none;
		animation: settle 0.5s ease-out;
	}
	@keyframes settle {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	.hero h1 {
		margin-top: 0.5rem;
		font-size: clamp(2.25rem, 5.1vw, 4.25rem);
		text-shadow: 0 2px 18px rgb(0 0 0 / 0.5);
	}
	.compact h1 {
		font-size: clamp(2rem, 4.2vw, 3.25rem);
	}
	.hero h1.hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.tagline {
		margin: 0.75rem 0 0;
		max-width: 56ch;
		font-size: clamp(1.0625rem, 2vw, 1.3125rem);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}
	.cta :global(.secondary) {
		background: rgb(20 16 14 / 0.45);
	}
	.next {
		flex: none;
		display: grid;
		gap: 0.25rem;
		width: min(24rem, 40%);
		color: var(--text);
		text-decoration: none;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		backdrop-filter: blur(10px);
		transition: transform 0.15s;
	}
	.next:hover {
		transform: translateY(-2px);
	}
	.date {
		font-weight: 500;
	}
	.next-title {
		font-size: 1.5rem;
		line-height: 1.2;
	}
	.next-go {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.5rem;
		color: var(--accent-ink);
		font-weight: 600;
	}
	.recruit {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1fr;
		gap: 2.5rem;
		padding-block: 2.5rem;
		border-bottom: 1px solid var(--border);
	}
	.recruit p {
		margin: 0;
	}
	.recruit-text {
		margin-top: 0.75rem !important;
		max-width: 44ch;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.mark {
		display: inline-flex;
	}
	.story {
		display: grid;
		grid-template-columns: 1.7fr 1fr;
		gap: 4.5rem;
		padding-block: 5rem;
	}
	.story h2 {
		margin: 0 0 1.5rem;
	}
	.prose :global(p) {
		margin: 0 0 1rem;
	}
	.prose :global(p:last-child) {
		margin-bottom: 0;
	}
	.lead :global(p) {
		color: var(--muted);
	}
	/* Le premier paragraphe se lit comme une introduction. */
	.lead :global(p:first-of-type) {
		color: var(--text);
		font-family: var(--font-read);
		font-size: clamp(1.25rem, 2.2vw, 1.5rem);
		font-variation-settings: 'SOFT' 60, 'WONK' 0;
		line-height: 1.4;
		letter-spacing: -0.008em;
	}
	.facts h3 {
		margin: 0 0 0.75rem;
	}
	.facts h3:not(:first-child) {
		margin-top: 2.25rem;
	}
	.facts ul {
		list-style: none;
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
	}
	.facts li {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}
	.ic {
		display: inline-flex;
		color: var(--accent-ink);
	}
	.figures {
		position: relative;
		padding-top: 3.5rem;
		border-top: 1px solid var(--border);
	}
	/* Gemme du blason posée sur la séparation. */
	.figures::before {
		content: '';
		position: absolute;
		top: -5px;
		left: 50%;
		width: 9px;
		height: 9px;
		transform: rotate(45deg);
		background: var(--accent);
		box-shadow: 0 0 0 4px var(--bg), 0 0 10px 3px color-mix(in srgb, var(--accent) 60%, transparent);
	}
	.figures h2 {
		margin: 0;
	}
	.figures-grid {
		display: grid;
		grid-template-columns: auto auto 1fr;
		gap: 4rem;
		align-items: end;
		margin-top: 2rem;
	}
	.big strong {
		display: block;
		font-size: 3.75rem;
		line-height: 1;
	}
	.roles p {
		margin: 0 0 0.75rem;
	}
	.classes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 2rem;
	}
	@media (max-width: 860px) {
		.wrap,
		.hero-in {
			padding-inline: 1.25rem;
		}
		.hero {
			height: 640px;
		}
		.hero.compact {
			height: auto;
			min-height: 560px;
			display: flex;
			align-items: flex-end;
		}
		.ban {
			object-position: 72% 30%;
		}
		.hero-in {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
			bottom: 1.5rem;
		}
		.compact .hero-in {
			position: relative;
			inset: auto;
			padding-block: 6rem 1.5rem;
			align-items: stretch;
			gap: 1.25rem;
		}
		.blazon :global(img) {
			width: 96px !important;
			height: 96px !important;
		}
		.next {
			width: 100%;
		}
		.recruit,
		.story {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.story {
			padding-block: 3rem;
		}
		.figures-grid {
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
		}
		.roles {
			grid-column: 1 / -1;
		}
	}
</style>
