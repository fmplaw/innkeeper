<script lang="ts">
	import { gameStatus } from '$lib/game-status';

	// Présence en jeu d'un perso (import du registre de guilde) : coche verte ou alerte.
	let {
		character,
		importAt,
		showPending = false
	}: {
		character: { gameSyncedAt: Date | null; createdAt: Date; armoryStatus?: 'found' | 'mismatch' | 'missing' | null; declaredNew?: boolean };
		importAt: Date | null;
		showPending?: boolean;
	} = $props();

	const status = $derived(gameStatus(character, importAt));
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

{#if character.armoryStatus === 'mismatch'}
	<span class="game missing" title="Un perso de ce nom existe dans l'Armurerie de Blizzard, mais avec une autre classe : fiche à corriger ?">⚠<span class="label"> autre classe en jeu</span></span>
{:else if status === 'seen'}
	<span class="game seen" title="Trouvé dans la guilde en jeu (import du {day.format(importAt!)})">✔<span class="label"> en jeu</span></span>
{:else if character.armoryStatus === 'found'}
	<span class="game exists" title="Trouvé dans l'Armurerie de Blizzard, pas (encore) dans la guilde en jeu">✔<span class="label"> existe en jeu</span></span>
{:else if character.declaredNew}
	<span class="game pending" title="Le joueur indique que ce perso n'existe pas encore en jeu">nouveau perso, pas encore créé</span>
{:else if status === 'missing' || character.armoryStatus === 'missing'}
	<span
		class="game missing"
		title={status === 'missing'
			? `Aucun perso de ce nom dans la guilde en jeu (import du ${day.format(importAt!)}) : nom mal orthographié, ou perso pas encore dans la guilde`
			: "Introuvable dans l'Armurerie de Blizzard : nom mal orthographié, ou perso pas encore reconnecté au jeu"}>⚠<span class="label"> pas trouvé en jeu</span></span
	>
{:else if status === 'pending' && showPending}
	<span class="game pending" title="Fiche créée après le dernier import du jeu">pas encore vérifié en jeu</span>
{/if}

<style>
	.game {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.0625rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		vertical-align: middle;
	}
	.seen {
		background: color-mix(in oklab, var(--good) 11%, var(--bg));
		color: var(--good);
	}
	.exists {
		background: color-mix(in oklab, var(--good) 7%, var(--bg));
		color: var(--good);
		font-weight: 500;
	}
	.missing {
		background: color-mix(in oklab, var(--warn) 11%, var(--bg));
		color: var(--warn);
	}
	.pending {
		color: var(--muted);
		font-weight: 400;
	}
</style>
