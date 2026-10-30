<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();

	const links = $derived([
		{ href: '/admin', label: 'Joueurs' },
		{ href: '/admin/candidatures', label: data.pendingApplications ? `Candidatures (${data.pendingApplications})` : 'Candidatures' },
		{ href: '/admin/progression', label: data.dueReviews ? `Progression (${data.dueReviews})` : 'Progression' },
		{ href: '/admin/recrutement', label: 'Recrutement' },
		{ href: '/admin/guilde', label: 'Guilde' },
		{ href: '/admin/rosters', label: 'Rosters' },
		{ href: '/admin/sorties', label: 'Sorties' },
		{ href: '/admin/import', label: 'Import du jeu' },
		{ href: '/admin/roles', label: 'Rôles Discord' },
		...(data.admin ? [{ href: '/admin/discord', label: 'Connexion Discord' }, { href: '/admin/compte', label: 'Compte admin' }, { href: '/admin/journal', label: 'Journal' }] : [])
	]);
	const showNav = $derived(page.url.pathname !== '/admin/connexion' && (data.admin || data.user?.permission === 'officer'));
</script>

{#if showNav}
	<nav class="subnav">
		{#each links as link (link.href)}
			<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
		{/each}
	</nav>
{/if}

{@render children()}

<style>
	.subnav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1.5rem;
	}
	.subnav a {
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.subnav a[aria-current='page'] {
		border-color: var(--accent);
		background: var(--surface-2);
	}
</style>
