<script lang="ts">
	import { page } from '$app/state';
	import Glyph, { type GlyphName } from '$lib/components/Glyph.svelte';

	let { data, children } = $props();

	type Link = { href: string; label: string; icon: GlyphName; badge?: number };

	// Quinze pages rangées par usage : le quotidien d'abord, les réglages techniques à la fin.
	const groups = $derived<{ label: string; links: Link[] }[]>([
		{
			label: 'La guilde',
			links: [
				{ href: '/admin', label: 'Joueurs', icon: 'users' },
				{ href: '/admin/candidatures', label: 'Candidatures', icon: 'inbox', badge: data.pendingApplications },
				{ href: '/admin/progression', label: 'Progression', icon: 'sparkles', badge: data.dueReviews },
				{ href: '/admin/statistiques', label: 'Statistiques', icon: 'chart' }
			]
		},
		{
			label: 'Organisation',
			links: [
				{ href: '/admin/rosters', label: 'Rosters', icon: 'list' },
				{ href: '/admin/sorties', label: 'Sorties', icon: 'calendar' },
				{ href: '/admin/import', label: 'Import du jeu', icon: 'upload' }
			]
		},
		{
			label: 'Vitrine',
			links: [
				{ href: '/admin/guilde', label: 'Guilde', icon: 'palette' },
				{ href: '/admin/recrutement', label: 'Recrutement', icon: 'user-plus' },
				{ href: '/admin/charte', label: 'Charte', icon: 'scroll' },
				{ href: '/admin/addons', label: 'Addons', icon: 'puzzle' }
			]
		},
		...(data.instanceAdmin || data.admin
			? [
					{
						label: 'Instance',
						links: [
							...(data.instanceAdmin
								? ([
										{ href: '/admin/roles', label: 'Rôles Discord', icon: 'key' },
										{ href: '/admin/discord', label: 'Connexion Discord', icon: 'plug' },
										{ href: '/admin/journal', label: 'Journal', icon: 'book' }
									] as const)
								: []),
							// Comptes admin et désignation des admins Discord : compte local seulement (accès de secours).
							...(data.admin ? ([{ href: '/admin/compte', label: 'Compte admin', icon: 'lock' }] as const) : [])
						]
					}
				]
			: [])
	]);
	const showNav = $derived(page.url.pathname !== '/admin/connexion' && (data.admin || data.user?.permission === 'officer'));
	const isCurrent = (href: string) => (href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href));
</script>

{#if showNav}
	<div class="admin">
		<nav class="side" aria-label="Administration">
			{#each groups as group (group.label)}
				<div class="group">
					<p>{group.label}</p>
					{#each group.links as link (link.href)}
						<a href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined}>
							<Glyph name={link.icon} size={17} />
							<span>{link.label}</span>
							{#if link.badge}<span class="count">{link.badge}</span>{/if}
						</a>
					{/each}
				</div>
			{/each}
		</nav>
		<div class="page">
			{#if !data.config.guild.serverType}
				<p class="notice warn">
					<span>
						Le type de serveur de la guilde (JcJ, JcE, JdR…) n'est pas encore renseigné : choisis-le dans
						<a href="/admin/guilde">Admin → Guilde</a>, il s'affiche sur l'accueil et en bas de chaque page.
					</span>
				</p>
			{/if}
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.admin {
		display: grid;
		grid-template-columns: 13.5rem minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
	}
	.side {
		position: sticky;
		top: 96px;
		display: grid;
		gap: 1.25rem;
		max-height: calc(100dvh - 112px);
		overflow-y: auto;
	}
	.group {
		display: grid;
		gap: 2px;
	}
	.group p {
		margin: 0 0 0.25rem;
		padding-inline: 0.625rem;
		color: var(--muted);
		font-size: 0.8125rem;
		font-weight: 600;
	}
	.side a {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-height: 36px;
		padding-inline: 0.625rem;
		border-radius: 9px;
		color: var(--muted);
		font-weight: 500;
		font-size: 0.9375rem;
		text-decoration: none;
		transition: background 0.15s, color 0.15s;
	}
	.side a:hover {
		background: var(--tint);
		color: var(--text);
	}
	.side a[aria-current='page'] {
		background: var(--tint);
		color: var(--accent-ink);
	}
	.count {
		margin-left: auto;
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
	}
	.page {
		min-width: 0;
	}

	/* Petit écran : les groupes deviennent une bande qu'on fait défiler au-dessus de la page. */
	@media (max-width: 1000px) {
		.admin {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.5rem;
		}
		.side {
			position: static;
			display: flex;
			gap: 1rem;
			margin-inline: -1.25rem;
			padding: 0 1.25rem 0.5rem;
			max-height: none;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.group {
			display: flex;
			gap: 0.25rem;
		}
		.group p {
			display: none;
		}
		.side a {
			min-height: 40px;
			padding-inline: 0.75rem;
			white-space: nowrap;
		}
	}
</style>
