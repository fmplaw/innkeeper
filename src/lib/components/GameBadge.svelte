<script lang="ts">
	import { gameStatus } from '$lib/game-status';

	// Présence en jeu d'un perso (import du registre de guilde) : coche verte ou alerte.
	let {
		character,
		importAt,
		showPending = false
	}: {
		character: { gameSyncedAt: Date | null; createdAt: Date };
		importAt: Date | null;
		showPending?: boolean;
	} = $props();

	const status = $derived(gameStatus(character, importAt));
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

{#if status === 'seen'}
	<span class="game seen" title="Trouvé dans la guilde en jeu (import du {day.format(importAt!)})">✔<span class="label"> en jeu</span></span>
{:else if status === 'missing'}
	<span class="game missing" title="Aucun perso de ce nom dans la guilde en jeu (import du {day.format(importAt!)}) : nom mal orthographié, ou perso pas encore dans la guilde">⚠<span class="label"> pas trouvé en jeu</span></span>
{:else if status === 'pending' && showPending}
	<span class="game pending" title="Fiche créée après le dernier import du jeu">pas encore vérifié en jeu</span>
{/if}

<style>
	.game {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		border: 1px solid currentColor;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		vertical-align: middle;
	}
	.seen {
		color: #56d364;
	}
	.missing {
		color: var(--gold);
	}
	.pending {
		color: var(--muted);
		font-weight: 400;
	}
</style>
