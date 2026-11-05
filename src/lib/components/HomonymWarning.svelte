<script lang="ts">
	// Autres fiches que l'import du jeu ne sait pas distinguer de celle-ci : même prénom et même nom
	// de famille, ou même prénom quand l'une n'a pas de nom de famille. Dans Forever, le nom complet
	// est unique : l'une des fiches est fausse, et l'import n'en met à jour aucune.
	// `viewerId` : le propriétaire de la fiche, pour dire « un autre de tes persos ».
	let {
		homonyms,
		viewerId = null,
		compact = false
	}: {
		homonyms: { name: string; surname: string | null; userId: string; player: string }[] | undefined;
		viewerId?: string | null;
		compact?: boolean;
	} = $props();

	const owners = $derived([...new Set((homonyms ?? []).map((h) => (h.userId === viewerId ? 'un autre de tes persos' : `la fiche de ${h.player}`)))]);
	const fullName = $derived(homonyms?.length ? [homonyms[0].name, homonyms[0].surname].filter(Boolean).join(' ') : '');
</script>

{#if homonyms?.length}
	{#if compact}
		<span class="homonym" title="Même nom que {owners.join(', ')} : l'import du jeu ne met à jour aucune de ces fiches">⚠ nom en double</span>
	{:else}
		<p class="homonym-note">
			⚠ <strong>{fullName}</strong> porte le même nom que {owners.join(', ')}. Dans Forever, le nom complet (prénom et nom
			de famille) est unique : l'import du jeu ne sait pas quelle fiche mettre à jour, et n'en met à jour aucune. Vérifie que
			le prénom et le nom de famille de ta fiche sont exactement ceux du jeu ; si quelqu'un a créé une fiche à ton nom,
			préviens un officier.
		</p>
	{/if}
{/if}

<style>
	.homonym {
		display: inline-flex;
		align-items: center;
		padding: 0.0625rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in oklab, var(--warn) 11%, var(--bg));
		color: var(--warn);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		vertical-align: middle;
	}
	.homonym-note {
		margin: 0.5rem 0;
		padding: 0.625rem 0.875rem;
		border-radius: 10px;
		background: color-mix(in oklab, var(--warn) 9%, var(--bg));
		font-size: 0.875rem;
	}
</style>
