<script lang="ts">
	import InterestBadges from '$lib/components/InterestBadges.svelte';
	import { className, classColor, specRole } from '$lib/labels';

	let { data } = $props();
	const cfg = $derived(data.config);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const TABS = [
		{ id: 'pending', label: 'En attente' },
		{ id: 'accepted', label: 'Acceptées' },
		{ id: 'refused', label: 'Refusées' },
		{ id: 'withdrawn', label: 'Retirées' }
	];
</script>

<div class="row head">
	<h1>Candidatures</h1>
	<a href="/admin/recrutement" class="muted">Réglages du recrutement</a>
</div>

<nav class="tabs">
	{#each TABS as tab (tab.id)}
		<a href="?statut={tab.id}" aria-current={data.status === tab.id ? 'page' : undefined}>{tab.label}</a>
	{/each}
</nav>

{#if data.applications.length === 0}
	<p class="card muted">Aucune candidature ici.</p>
{:else}
	<ul class="list">
		{#each data.applications as a (a.app.id)}
			{@const c = a.app.character}
			<li>
				<a class="card item" href="/admin/candidatures/{a.app.id}">
					{#if a.avatar}<img src={a.avatar} alt="" />{/if}
					<div class="who">
						<strong>{a.name}</strong>
						<span>
							<span class="cls"><span class="dot" style:--c={classColor(cfg, c.class)}></span>{c.name} · {className(cfg, c.class)}</span>
							<span class="muted">· {specRole(cfg, c.class, c.spec ?? null, c.role)} · niv. {c.level}</span>
						</span>
						<span><InterestBadges pve={c.pve ?? null} pvp={c.pvp ?? null} compact /></span>
					</div>
					<div class="meta">
						<span class="votes"><span class="up">+{a.up}</span> <span class="down">−{a.down}</span></span>
						<span class="muted small">{dateFormat.format(a.app.createdAt)}</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		justify-content: space-between;
		align-items: baseline;
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.tabs a {
		padding: 0.35rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text);
		text-decoration: none;
	}
	.tabs a[aria-current='page'] {
		border-color: var(--accent);
		background: var(--surface-2);
		color: var(--gold);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: var(--text);
		text-decoration: none;
	}
	.item:hover {
		border-color: var(--accent);
	}
	.item img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}
	.who {
		flex: 1;
		display: grid;
		gap: 0.15rem;
	}
	.meta {
		display: grid;
		justify-items: end;
		gap: 0.2rem;
	}
	.votes {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.up {
		color: var(--good);
	}
	.down {
		color: var(--danger);
	}
	.small {
		font-size: 0.85rem;
	}
</style>
