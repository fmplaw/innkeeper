<script lang="ts">
	import '@fontsource-variable/cinzel';
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/instrument-sans';
	import { SOURCE_URL } from '$lib/project';
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Crest from '$lib/components/Crest.svelte';
	import Glyph, { type GlyphName } from '$lib/components/Glyph.svelte';
	import { GUILD_FACTION_LABELS, SERVER_TYPE_INFO } from '$lib/game/forever';

	let { data, children } = $props();

	const guild = $derived(data.config.guild);
	const server = $derived(guild.serverType ? SERVER_TYPE_INFO[guild.serverType] : null);
	const isHome = $derived(page.url.pathname === '/');
	const inSetup = $derived(page.url.pathname.startsWith('/installation'));
	const adminCount = $derived(data.pendingApplications + data.dueReviews + data.unseenDepartures);

	const links = $derived<{ href: string; label: string; icon: GlyphName; badge?: number }[]>([
		{ href: '/', label: 'Accueil', icon: 'home' },
		...(data.user || data.admin
			? ([
					{ href: '/sorties', label: 'Sorties', icon: 'calendar' },
					{ href: '/roster', label: 'Roster', icon: 'users' },
					{ href: '/artisans', label: 'Artisans', icon: 'hammer' }
				] as const)
			: []),
		...(data.user ? ([{ href: '/persos', label: 'Mes persos', icon: 'user' }] as const) : []),
		...(data.candidate ? ([{ href: '/candidature', label: 'Ma candidature', icon: 'file' }] as const) : []),
		...(data.config.hasCharter ? ([{ href: '/charte', label: 'Charte', icon: 'scroll' }] as const) : []),
		...(data.config.hasAddons ? ([{ href: '/addons', label: 'Addons', icon: 'puzzle' }] as const) : []),
		...(data.user?.permission === 'officer' || data.admin ? [{ href: '/admin', label: 'Admin', icon: 'settings' as const, badge: adminCount }] : [])
	]);
	const isCurrent = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));

	// Téléphone : barre d'onglets en bas ; ce qui n'y tient pas passe dans « Plus ».
	const MAX_TABS = 5;
	const tabs = $derived(links.length > MAX_TABS ? links.slice(0, MAX_TABS - 1) : links);
	const overflow = $derived(links.length > MAX_TABS ? links.slice(MAX_TABS - 1) : []);
	const overflowBadge = $derived(overflow.reduce((n, l) => n + (l.badge ?? 0), 0));
	const me = $derived(data.user ?? data.candidate);
	const signedIn = $derived(Boolean(me || data.admin));
	const showTabs = $derived(!inSetup && (links.length > 1 || signedIn));

	let sheetOpen = $state(false);
	let accountOpen = $state(false);
	afterNavigate(() => {
		sheetOpen = false;
		accountOpen = false;
	});

	// Sur l'accueil, l'en-tête flotte sur la bannière puis prend son fond au défilement.
	let scrollY = $state(0);
	const floating = $derived(isHome && scrollY < 40);

	function closeOnOutside(e: MouseEvent) {
		if (accountOpen && !(e.target as Element).closest('.account')) accountOpen = false;
	}
	// Bulles Wowhead (réglage de la guilde) : le script de Wowhead repère tout seul les liens
	// vers wowhead.com, y compris sur les pages ouvertes ensuite. Chargé une seule fois.
	$effect(() => {
		if (!data.config.wowheadTooltips || document.getElementById('wowhead-tooltips')) return;
		(window as unknown as { whTooltips: object }).whTooltips = { colorLinks: false, iconizeLinks: true, renameLinks: false };
		const script = document.createElement('script');
		script.id = 'wowhead-tooltips';
		script.src = 'https://wow.zamimg.com/js/tooltips.js';
		script.async = true;
		document.head.append(script);
	});

	function closeOnEscape(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		sheetOpen = false;
		accountOpen = false;
	}
</script>

<svelte:head>
	<title>{guild.name}</title>
	{#if guild.logoUrl}<link rel="icon" href={guild.logoUrl} />{/if}
</svelte:head>

<svelte:window bind:scrollY onclick={closeOnOutside} onkeydown={closeOnEscape} />

{#snippet accountActions()}
	{#if data.config.demo}<a class="menu-item" href="/connexion"><Glyph name="users" size={17} /> Changer de profil</a>{/if}
	{#if me}
		<form method="POST" action="/deconnexion">
			<input type="hidden" name="redirectTo" value="/" />
			<button class="menu-item"><Glyph name="logout" size={17} /> Déconnexion</button>
		</form>
	{/if}
	{#if data.admin}
		<form method="POST" action="/admin/connexion?/logout">
			<button class="menu-item"><Glyph name="logout" size={17} /> Quitter l'admin</button>
		</form>
	{/if}
{/snippet}

{#snippet avatar(src: string | null | undefined, name: string)}
	{#if src}<img class="avatar" {src} alt="" />{:else}<span class="avatar" aria-hidden="true">{name[0]?.toUpperCase()}</span>{/if}
{/snippet}

<!-- La couleur d'accent de la guilde s'applique à tout le site via la variable CSS. -->
<div class="app" data-faction={guild.faction} style:--accent={guild.accentColor} style:--banner={guild.bannerUrl ? `url('${guild.bannerUrl}')` : undefined}>
	{#if data.config.demo}
		<p class="demo-strip">
			Site de démonstration : guilde fictive, Discord et Raid-Helper simulés.
			<a href="/connexion">Changer de profil</a>
		</p>
	{/if}

	<header class="top" class:over={floating} class:on-hero={isHome}>
		<div class="top-in">
			{#if inSetup}
				<span class="brand"><Crest src={guild.logoUrl} size={36} /><span class="brand-name">{guild.name}</span></span>
			{:else}
				<a class="brand" href="/"><Crest src={guild.logoUrl} size={36} /><span class="brand-name">{guild.name}</span></a>
				<nav aria-label="Navigation principale">
					{#each links as link (link.href)}
						<a class="nav-link" href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined}>
							{link.label}{#if link.badge}<span class="count">{link.badge}</span>{/if}
						</a>
					{/each}
				</nav>
				{#if signedIn}
					<div class="account">
						<button class="me" aria-expanded={accountOpen} aria-haspopup="menu" onclick={() => (accountOpen = !accountOpen)}>
							{#if me}
								{@render avatar(me.avatar, me.displayName)}<span class="me-name">{me.displayName}</span>
							{:else if data.admin}
								{@render avatar(null, data.admin.username)}<span class="me-name">{data.admin.username}</span>
							{/if}
							<span class="chevron"><Glyph name="chevron-down" size={15} /></span>
						</button>
						{#if accountOpen}
							<div class="menu">
								{#if data.admin}<p class="menu-note">Admin de l'instance</p>{/if}
								{@render accountActions()}
							</div>
						{/if}
					</div>
				{:else if page.url.pathname !== '/connexion'}
					<a class="button secondary small sign-in" href="/connexion">Se connecter</a>
				{/if}
			{/if}
		</div>
	</header>

	<main class:home={isHome}>
		{@render children()}
	</main>

	{#if !inSetup}
		<footer>
			<div class="foot-in">
				<strong>{guild.name}</strong>
				<span class="muted">
					Guilde {GUILD_FACTION_LABELS[guild.faction]}{#if server}, serveur <abbr title={server.name}>{server.label}</abbr>,{/if} sur World of Warcraft Forever
				</span>
				<span class="foot-links">
					{#if data.config.hasCharter}<a href="/charte">Charte</a>{/if}
					<a href="/confidentialite">Confidentialité</a>
					<a href={SOURCE_URL} rel="noopener">Propulsé par Innkeeper</a>
				</span>
			</div>
		</footer>
	{/if}

	{#if showTabs}
		{#if sheetOpen}
			<button class="scrim" aria-label="Fermer le menu" onclick={() => (sheetOpen = false)}></button>
			<div class="sheet" id="plus">
				{#each overflow as link (link.href)}
					<a class="menu-item" href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined}>
						<Glyph name={link.icon} size={19} /> {link.label}{#if link.badge}<span class="count">{link.badge}</span>{/if}
					</a>
				{/each}
				{#if signedIn}
					<p class="menu-note">{me?.displayName ?? data.admin?.username}</p>
					{@render accountActions()}
				{/if}
			</div>
		{/if}
		<nav class="tabbar" aria-label="Navigation mobile">
			{#each tabs as link (link.href)}
				<a href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined}>
					<span class="tab-icon"><Glyph name={link.icon} size={21} />{#if link.badge}<span class="count">{link.badge}</span>{/if}</span>
					{link.label}
				</a>
			{/each}
			{#if overflow.length || signedIn}
				<button aria-expanded={sheetOpen} aria-controls="plus" onclick={() => (sheetOpen = !sheetOpen)}>
					<span class="tab-icon"><Glyph name="menu" size={21} />{#if overflowBadge}<span class="count">{overflowBadge}</span>{/if}</span>
					Plus
				</button>
			{/if}
		</nav>
	{/if}
</div>

<style>
	.demo-strip {
		margin: 0;
		padding: 0.3125rem 1rem;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.8125rem;
		text-align: center;
	}
	.demo-strip a {
		margin-left: 0.5rem;
		color: var(--gold);
	}
	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		/* Le fond suit la palette de la faction (variables redéfinies sur .app). */
		background: var(--bg);
		color: var(--text);
	}
	main {
		flex: 1;
	}
	main.home {
		width: 100%;
		max-width: none;
		padding: 0 0 6rem;
	}

	/* En-tête */
	.top {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in srgb, var(--bg) 86%, transparent);
		backdrop-filter: blur(14px);
		transition: background 0.2s;
	}
	/* Filet de braise sous l'en-tête. */
	.top::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 70%, transparent) 22%, var(--gold) 50%, color-mix(in srgb, var(--accent) 70%, transparent) 78%, transparent);
	}
	.top.on-hero {
		margin-bottom: -72px;
	}
	.top.over {
		background: none;
		backdrop-filter: none;
	}
	.top.over::after {
		display: none;
	}
	.top.over .brand,
	.top.over .me,
	.top.over .nav-link:not([aria-current='page']) {
		color: #fff;
		text-shadow: 0 1px 6px rgb(0 0 0 / 0.7);
	}
	.top.over .sign-in {
		background: rgb(20 10 6 / 0.45);
		border-color: rgb(255 230 200 / 0.3);
	}
	.top-in {
		display: flex;
		align-items: center;
		gap: 2rem;
		height: 72px;
		width: min(1160px, 100%);
		margin-inline: auto;
		padding-inline: 2rem;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		color: var(--text);
		font-family: var(--font-display);
		font-weight: 600;
		text-decoration: none;
	}
	.brand-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.top nav {
		display: flex;
		gap: 0.125rem;
		margin-right: auto;
	}
	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.75rem;
		border-radius: 999px;
		color: var(--muted);
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: background 0.15s, color 0.15s;
	}
	.nav-link:hover {
		color: var(--text);
		background: var(--tint);
	}
	.nav-link[aria-current='page'] {
		color: var(--accent-ink);
		background: var(--tint);
	}
	.count {
		min-width: 18px;
		height: 18px;
		padding-inline: 5px;
		display: inline-grid;
		place-items: center;
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		font-size: 0.6875rem;
		font-weight: 700;
		line-height: 1;
		text-shadow: none;
	}

	/* Compte */
	.account {
		position: relative;
		margin-left: auto;
	}
	.top nav + .account {
		margin-left: 0;
	}
	.me {
		min-height: 0;
		padding: 0.25rem;
		gap: 0.5rem;
		border: 0;
		background: none;
		box-shadow: none;
		color: var(--text);
		font-weight: 500;
	}
	.me:hover {
		filter: none;
	}
	.me-name {
		max-width: 9rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.chevron {
		display: inline-flex;
		color: var(--muted);
	}
	.avatar {
		flex: none;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--tint);
		color: var(--accent-ink);
		font-size: 0.875rem;
		font-weight: 700;
		text-shadow: none;
		object-fit: cover;
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.5rem);
		z-index: 25;
		min-width: 13rem;
		display: grid;
		padding: 0.375rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		box-shadow: 0 2px 4px rgb(0 0 0 / 0.3), 0 14px 36px rgb(0 0 0 / 0.4);
	}
	.menu-item {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.625rem;
		width: 100%;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 0;
		border-radius: 8px;
		background: none;
		box-shadow: none;
		color: var(--text);
		font-weight: 500;
		text-decoration: none;
		text-align: left;
	}
	.menu-item:hover {
		background: var(--tint);
		filter: none;
	}
	.menu-item[aria-current='page'] {
		color: var(--accent-ink);
	}
	.menu-item .count {
		margin-left: auto;
	}
	.menu-note {
		margin: 0;
		padding: 0.5rem 0.75rem 0.25rem;
		color: var(--muted);
		font-size: 0.8125rem;
	}

	/* Pied de page */
	footer {
		border-top: 1px solid var(--border);
		font-size: 0.875rem;
	}
	.foot-in {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.5rem;
		width: min(1160px, 100%);
		margin-inline: auto;
		padding: 2rem;
	}
	footer strong {
		font-family: var(--font-display);
		font-weight: 600;
	}
	.foot-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		margin-left: auto;
	}
	.foot-links a {
		color: var(--muted);
	}

	.tabbar,
	.sheet,
	.scrim {
		display: none;
	}

	/* Les onglets du menu prennent toute la place avant que le nom de la guilde ne soit coupé. */
	@media (max-width: 1120px) {
		.me-name,
		.chevron {
			display: none;
		}
		.top-in {
			gap: 1rem;
		}
	}

	/* Téléphone et petite tablette : barre d'onglets en bas. */
	@media (max-width: 860px) {
		.top.on-hero {
			margin-bottom: -60px;
		}
		.top-in {
			height: 60px;
			justify-content: space-between;
			padding-inline: 1.25rem;
		}
		.top nav,
		.account {
			display: none;
		}
		.sign-in {
			margin-left: auto;
		}
		.foot-in {
			padding: 1.75rem 1.25rem 6.5rem;
		}
		.foot-links {
			margin-left: 0;
		}
		main.home {
			padding-bottom: 3rem;
		}
		.tabbar {
			position: fixed;
			z-index: 30;
			inset: auto 0 0;
			display: grid;
			grid-auto-flow: column;
			grid-auto-columns: 1fr;
			padding: 0.375rem 0.25rem calc(0.375rem + env(safe-area-inset-bottom));
			background: color-mix(in srgb, var(--bg) 92%, transparent);
			backdrop-filter: blur(14px);
			border-top: 1px solid var(--border);
		}
		.tabbar a,
		.tabbar button {
			display: grid;
			justify-items: center;
			align-content: center;
			gap: 2px;
			min-height: 48px;
			padding: 0;
			border: 0;
			border-radius: 8px;
			background: none;
			box-shadow: none;
			color: var(--muted);
			font-size: 0.6875rem;
			font-weight: 500;
			text-decoration: none;
			white-space: nowrap;
		}
		.tabbar button:hover {
			filter: none;
		}
		.tabbar a[aria-current='page'] {
			color: var(--accent-ink);
		}
		.tab-icon {
			position: relative;
			display: inline-flex;
		}
		.tab-icon .count {
			position: absolute;
			top: -6px;
			left: 14px;
		}
		.scrim {
			display: block;
			position: fixed;
			z-index: 28;
			inset: 0;
			padding: 0;
			border-radius: 0;
			background: rgb(0 0 0 / 0.5);
			box-shadow: none;
		}
		.scrim:hover {
			filter: none;
		}
		.sheet {
			position: fixed;
			z-index: 29;
			inset: auto 0 0;
			display: grid;
			padding: 0.75rem 0.75rem calc(4.75rem + env(safe-area-inset-bottom));
			border-radius: 18px 18px 0 0;
			background: var(--surface);
			box-shadow: 0 -12px 36px rgb(0 0 0 / 0.45);
		}
	}
</style>
