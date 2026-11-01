<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();

	const links = $derived([
		{ href: '/admin', label: 'Joueurs' },
		{ href: '/admin/candidatures', label: data.pendingApplications ? `Candidatures (${data.pendingApplications})` : 'Candidatures' },
		{ href: '/admin/statistiques', label: 'Statistiques' },
		{ href: '/admin/progression', label: data.dueReviews ? `Progression (${data.dueReviews})` : 'Progression' },
		{ href: '/admin/recrutement', label: 'Recrutement' },
		{ href: '/admin/guilde', label: 'Guilde' },
		{ href: '/admin/charte', label: 'Charte' },
		{ href: '/admin/addons', label: 'Addons' },
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
	{#if !data.config.guild.serverType}
		<p class="card notice">
			Le type de serveur de la guilde (JcJ, JcE, JdR…) n'est pas encore renseigné : choisis-le dans
			<a href="/admin/guilde">Admin → Guilde</a>, il s'affiche sur l'accueil et en bas de chaque page.
		</p>
	{/if}
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
	.notice {
		margin: 0 0 1.5rem;
		border-color: color-mix(in srgb, #e3a03a 50%, var(--border));
	}
	.subnav a[aria-current='page'] {
		border-color: var(--accent);
		background: var(--surface-2);
	}
</style>
