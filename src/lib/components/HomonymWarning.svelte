<script lang="ts">
	// Autres fiches du même nom : l'import du jeu relie les persos par leur nom et n'en met
	// alors à jour aucun. `viewerId` : le joueur qui regarde, pour dire « un autre de tes persos ».
	let {
		homonyms,
		viewerId = null,
		compact = false
	}: {
		homonyms: { name: string; userId: string; player: string }[] | undefined;
		viewerId?: string | null;
		compact?: boolean;
	} = $props();

	const owners = $derived([...new Set((homonyms ?? []).map((h) => (h.userId === viewerId ? 'un autre de tes persos' : `la fiche de ${h.player}`)))]);
</script>

{#if homonyms?.length}
	{#if compact}
		<span class="homonym" title="Même nom que {owners.join(', ')} : l'import du jeu ne met à jour aucune de ces fiches">⚠ nom en double</span>
	{:else}
		<p class="homonym-note">
			⚠ <strong>{homonyms[0].name}</strong> porte le même nom que {owners.join(', ')} : l'import du jeu ne peut pas savoir
			laquelle mettre à jour, et n'en met à jour aucune. Vérifie l'orthographe exacte du nom en jeu, ou préviens un officier
			si quelqu'un a créé une fiche à ton nom.
		</p>
	{/if}
{/if}

<style>
	.homonym {
		display: inline-flex;
		align-items: center;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		border: 1px solid currentColor;
		color: var(--gold);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		vertical-align: middle;
	}
	.homonym-note {
		margin: 0.5rem 0;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid var(--gold);
		background: var(--surface-2);
		font-size: 0.9rem;
	}
</style>
