<script lang="ts">
	import { SOURCE_URL } from '$lib/project';
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { GUILD_FACTION_LABELS, SERVER_TYPE_INFO } from '$lib/game/forever';

	let { data, children } = $props();

	const guild = $derived(data.config.guild);
	const server = $derived(guild.serverType ? SERVER_TYPE_INFO[guild.serverType] : null);
	const isHome = $derived(page.url.pathname === '/');
	const inSetup = $derived(page.url.pathname.startsWith('/installation'));

	const links = $derived([
		{ href: '/', label: 'Accueil' },
		...(data.user ? [{ href: '/persos', label: 'Mes persos' }] : []),
		...(data.user || data.admin
			? [
					{ href: '/roster', label: 'Roster' },
					{ href: '/sorties', label: 'Sorties' }
				]
			: []),
		...(data.config.hasCharter ? [{ href: '/charte', label: 'Charte' }] : []),
		...(data.config.hasAddons ? [{ href: '/addons', label: 'Addons' }] : []),
		...(data.candidate ? [{ href: '/candidature', label: 'Ma candidature' }] : []),
		...(data.user?.permission === 'officer' || data.admin
			? [
					{
						href: '/admin',
						label: data.pendingApplications + data.dueReviews ? `Admin (${data.pendingApplications + data.dueReviews})` : 'Admin'
					}
				]
			: [])
	]);
	const isCurrent = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	// Téléphone : menu replié derrière un bouton, refermé à chaque changement de page.
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));
	const currentLabel = $derived(links.find((l) => isCurrent(l.href))?.label ?? 'Menu');
	const me = $derived(data.user ?? data.candidate);
</script>

<svelte:head>
	<title>{guild.name}</title>
	{#if guild.logoUrl}<link rel="icon" href={guild.logoUrl} />{/if}
</svelte:head>

<!-- La couleur d'accent de la guilde s'applique à tout le site via la variable CSS. -->
<div class="app" data-faction={guild.faction} style:--accent={guild.accentColor}>
	{#if !inSetup}
		<!-- Bannière : grande sur l'accueil, réduite ailleurs. Sans image, un dégradé de la couleur d'accent. -->
		<a href="/" class="banner" class:home={isHome} class:plain={!guild.bannerUrl} class:titled={guild.bannerTitle}>
			{#if guild.bannerUrl}<img class="banner-img" src={guild.bannerUrl} alt="" />{/if}
			<div class="banner-content" class:hidden={!guild.bannerTitle}>
				{#if guild.logoUrl}<img class="logo" src={guild.logoUrl} alt="" />{/if}
				<div class="titles">
					<span class="name">{guild.name}</span>
					{#if isHome && guild.tagline}<span class="tagline">{guild.tagline}</span>{/if}
					{#if isHome}
						<span class="faction">
							{GUILD_FACTION_LABELS[guild.faction]}{#if server}{' '}· <abbr title={server.name}>{server.label}</abbr>{/if} · World of Warcraft Forever
						</span>
					{/if}
				</div>
			</div>
		</a>
	{/if}

	<header class="bar">
		<div class="inner" class:open={menuOpen}>
			{#if inSetup}<span class="setup-title">{guild.name}</span>{/if}
			{#if !inSetup && (links.length > 1 || me || data.admin)}
				<button class="menu-toggle" aria-expanded={menuOpen} aria-controls="menu" onclick={() => (menuOpen = !menuOpen)}>
					<span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
					{currentLabel}
				</button>
				{#if me?.avatar}<img class="menu-avatar" src={me.avatar} alt="" />{/if}
			{/if}
			<nav id="menu">
				{#if !inSetup}
					{#each links as link (link.href)}
						<a href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined}>{link.label}</a>
					{/each}
				{/if}
			</nav>
			{#if me}
				<div class="me">
					{#if me.avatar}<img src={me.avatar} alt="" />{/if}
					<span>{me.displayName}</span>
					<form method="POST" action="/deconnexion">
						<input type="hidden" name="redirectTo" value="/" />
						<button class="secondary">Déconnexion</button>
					</form>
				</div>
			{/if}
			{#if data.admin}
				<div class="me">
					<span class="badge">Admin : {data.admin.username}</span>
					<form method="POST" action="/admin/connexion?/logout">
						<button class="secondary">Quitter l'admin</button>
					</form>
				</div>
			{/if}
			{#if !data.user && !data.candidate && !data.admin && !inSetup && page.url.pathname !== '/connexion'}
				<a class="button" href="/connexion">Se connecter</a>
			{/if}
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	{#if !inSetup}
		<footer>
			<strong>{guild.name}</strong>
			{#if guild.tagline}<span>{guild.tagline}</span>{/if}
			<span class="muted">
				Guilde {GUILD_FACTION_LABELS[guild.faction]}{#if server}, serveur <abbr title={server.name}>{server.label}</abbr>,{/if} sur World of Warcraft Forever
			</span>
			{#if data.config.hasCharter}<a href="/charte" class="muted">Charte</a>{/if}
			<a href="/confidentialite" class="muted">Confidentialité</a>
			<a href={SOURCE_URL} class="muted" rel="noopener">Propulsé par Innkeeper</a>
		</footer>
	{/if}
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		/* Le fond suit la palette de la faction (variables redéfinies sur .app). */
		background: var(--bg);
		color: var(--text);
	}
	main {
		flex: 1;
		width: 100%;
	}

	/* Bannière */
	.banner {
		position: relative;
		display: block;
		/* Hauteur proportionnelle à la largeur : 8:1 en pages intérieures, 4:1 sur l'accueil,
		   plafonnée sur grand écran. Pas d'aspect-ratio : avec un max-height, il bride aussi la largeur. */
		height: clamp(5.5rem, 12.5vw, 9rem);
		overflow: hidden;
		color: var(--text);
		text-decoration: none;
		background: var(--surface);
	}
	.banner.home {
		height: clamp(11rem, 25vw, 20rem);
	}
	.banner.plain {
		background:
			radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 60%),
			linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, var(--bg)), var(--bg));
	}
	.banner-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
	/* Voile sombre en bas pour garder le titre lisible sur n'importe quelle image. */
	.banner.titled::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, transparent 35%, rgb(0 0 0 / 0.75));
		pointer-events: none;
	}
	.banner-content {
		position: absolute;
		z-index: 1;
		inset: auto 0 0 0;
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1rem 0.9rem;
		display: flex;
		align-items: flex-end;
		gap: 1rem;
	}
	.banner-content.hidden {
		/* Masqué visuellement mais lu par les lecteurs d'écran. */
		clip-path: inset(50%);
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.logo {
		width: clamp(3rem, 7vw, 4.5rem);
		height: clamp(3rem, 7vw, 4.5rem);
		object-fit: contain;
		filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.6));
	}
	.home .logo {
		width: clamp(5rem, 14vw, 9rem);
		height: clamp(5rem, 14vw, 9rem);
	}
	.titles {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-shadow: 0 2px 6px rgb(0 0 0 / 0.8);
	}
	.name {
		font-size: clamp(1.3rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--gold);
		letter-spacing: 0.02em;
	}
	.home .name {
		font-size: clamp(1.8rem, 5vw, 3.2rem);
	}
	.tagline {
		font-size: clamp(1rem, 2vw, 1.25rem);
		font-style: italic;
	}
	.faction {
		font-size: 0.85rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	/* Barre de menu */
	.bar {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		backdrop-filter: blur(6px);
		border-top: 2px solid var(--accent);
		border-bottom: 1px solid var(--border);
	}
	.inner {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0.6rem 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.setup-title {
		font-weight: 700;
		color: var(--gold);
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		flex: 1;
	}
	nav a {
		color: var(--text);
		text-decoration: none;
		padding: 0.2rem 0;
		border-bottom: 2px solid transparent;
	}
	nav a:hover {
		color: var(--gold);
	}
	nav a[aria-current='page'] {
		border-bottom-color: var(--accent);
		color: var(--gold);
	}
	.me {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.me img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
	}
	.me button {
		padding: 0.25rem 0.6rem;
		font-size: 0.85rem;
	}

	.menu-toggle,
	.menu-avatar {
		display: none;
	}

	/* Téléphone : bannière compacte et menu repliable. */
	@media (max-width: 40rem) {
		.banner {
			height: 4.5rem;
		}
		.banner.home {
			height: 9rem;
		}
		.banner-content {
			gap: 0.6rem;
			padding-bottom: 0.6rem;
		}
		.logo,
		.home .logo {
			width: 2.6rem;
			height: 2.6rem;
		}
		.home .logo {
			width: 4rem;
			height: 4rem;
		}
		.name,
		.home .name {
			font-size: 1.15rem;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.home .name {
			font-size: 1.45rem;
		}
		.titles {
			min-width: 0;
		}
		.tagline {
			font-size: 0.85rem;
		}
		.faction {
			display: none;
		}

		.inner {
			padding: 0.45rem 1rem;
			gap: 0.5rem;
			flex-wrap: nowrap;
			position: relative;
		}
		.menu-toggle {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			background: transparent;
			border: 1px solid var(--border);
			color: var(--gold);
			padding: 0.35rem 0.75rem;
			font-weight: 600;
			margin-right: auto;
		}
		.menu-avatar {
			display: block;
			width: 30px;
			height: 30px;
			border-radius: 50%;
		}
		/* Liste repliée : visible seulement quand le menu est ouvert, sous la barre. */
		nav,
		.me {
			display: none;
		}
		.open nav,
		.open .me {
			display: flex;
		}
		.open {
			flex-wrap: wrap;
		}
		.open nav {
			order: 3;
			flex-basis: 100%;
			flex-direction: column;
			gap: 0;
		}
		.open nav a {
			padding: 0.7rem 0.25rem;
			border-bottom: 1px solid var(--border);
		}
		.open nav a[aria-current='page'] {
			border-bottom-color: var(--border);
			border-left: 3px solid var(--accent);
			padding-left: 0.6rem;
		}
		.open .me {
			order: 4;
			flex-basis: 100%;
			padding: 0.6rem 0.25rem 0.3rem;
		}
		.open .me form {
			margin-left: auto;
		}
		/* « Se connecter » (visiteur) reste dans la barre, à droite. */
		.inner > .button {
			margin-left: auto;
		}
	}

	footer {
		border-top: 1px solid var(--border);
		padding: 1.5rem 1rem;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem 1rem;
		font-size: 0.9rem;
		text-align: center;
	}
	footer strong {
		color: var(--gold);
	}
</style>
