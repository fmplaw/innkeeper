<script lang="ts">
	import Glyph from '$lib/components/Glyph.svelte';
	import { ROLES, ROLE_ICONS, ROLE_LABELS, type Role } from '$lib/roles';

	// Une barre segmentée lit mieux quatre parts qu'un donut : on compare des longueurs alignées.
	let { counts }: { counts: Record<Role, number> } = $props();
	const total = $derived(ROLES.reduce((n, r) => n + (counts[r] ?? 0), 0));
</script>

<div class="rolebar">
	<div class="segments" role="img" aria-label={ROLES.map((r) => `${ROLE_LABELS[r]} ${counts[r] ?? 0}`).join(', ')}>
		{#each ROLES as r (r)}
			{#if counts[r]}
				<span style:flex={counts[r]} style:background="var(--r-{r})" title="{ROLE_LABELS[r]} : {counts[r]} sur {total}"></span>
			{/if}
		{/each}
	</div>
	<ul>
		{#each ROLES as r (r)}
			<li>
				<span class="mark" style:color="var(--r-{r})"><Glyph name={ROLE_ICONS[r]} size={16} /></span>
				<span>{ROLE_LABELS[r]}</span>
				<strong>{counts[r] ?? 0}</strong>
			</li>
		{/each}
	</ul>
</div>

<style>
	.segments {
		display: flex;
		gap: 2px;
		height: 12px;
	}
	.segments span {
		border-radius: 4px;
		min-width: 4px;
	}
	ul {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: 0.5rem 1.25rem;
		margin: 0.875rem 0 0;
		padding: 0;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.mark {
		display: inline-flex;
	}
	strong {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
</style>
