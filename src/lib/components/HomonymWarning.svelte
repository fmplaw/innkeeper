<script lang="ts">
	// Autres fiches du même prénom. Forever l'autorise (seul prénom + nom de famille est unique),
	// mais l'import du jeu relie encore les persos par leur prénom et n'en met alors à jour aucun.
	// `viewerId` : le propriétaire de la fiche, pour dire « un autre de tes persos ».
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
	// Tous au même joueur (plusieurs persos de même prénom) : rien d'anormal, seul l'import est concerné.
	const ownOnly = $derived(Boolean(homonyms?.length) && homonyms!.every((h) => h.userId === viewerId));
</script>

{#if homonyms?.length}
	{#if compact}
		{#if !ownOnly}
			<span class="homonym" title="Même prénom que {owners.join(', ')} : l'import du jeu ne met à jour aucune de ces fiches pour l'instant">⚠ prénom en double</span>
		{/if}
	{:else if ownOnly}
		<p class="homonym-note">
			ⓘ Plusieurs de tes persos portent le prénom <strong>{homonyms[0].name}</strong>. Forever l'autorise (seul le nom
			complet, avec le nom de famille, est unique), mais l'import du jeu ne sait pas encore les distinguer : il ne les met
			pas à jour pour l'instant. Rien à corriger de ton côté.
		</p>
	{:else}
		<p class="homonym-note">
			⚠ <strong>{homonyms[0].name}</strong> a le même prénom que {owners.join(', ')}. Forever l'autorise avec des noms de
			famille différents, mais l'import du jeu ne sait pas encore les distinguer : il ne met à jour aucune de ces fiches
			pour l'instant. Vérifie que le nom de famille de ta fiche est bien celui du jeu ; si quelqu'un a créé une fiche à ton
			nom, préviens un officier.
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
