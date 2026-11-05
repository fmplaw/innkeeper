<script lang="ts">
	import { gameStatus } from '$lib/game-status';

	// Présence en jeu d'un perso : registre de la guilde (addon ou Battle.net) et Armurerie de Blizzard.
	// L'infobulle explique le badge au survol, au clavier et au toucher (le `title` du navigateur
	// ne s'affiche pas sur téléphone).
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

	type Badge = { kind: 'seen' | 'exists' | 'missing' | 'pending'; icon: string; label: string; tip: string };
	const badge = $derived.by((): Badge | null => {
		const sync = importAt ? ` (synchro du ${day.format(importAt)})` : '';
		if (character.armoryStatus === 'mismatch')
			return {
				kind: 'missing',
				icon: '⚠',
				label: 'autre classe en jeu',
				tip: "Un perso de ce nom existe dans le jeu, mais avec une autre classe que celle de la fiche. Vérifie la classe, ou le nom s'il s'agit d'un autre perso."
			};
		if (status === 'seen')
			return { kind: 'seen', icon: '✔', label: 'en jeu', tip: `Dans la guilde en jeu : ce perso est dans le registre de la guilde${sync}.` };
		if (character.armoryStatus === 'found')
			return {
				kind: 'exists',
				icon: '✔',
				label: 'existe en jeu',
				tip: "Ce perso existe dans le jeu (Armurerie de Blizzard), mais il n'est pas dans la guilde : pas encore invité, ou parti. Il passera à « en jeu » une fois dans la guilde."
			};
		if (character.declaredNew)
			return { kind: 'pending', icon: '', label: 'nouveau perso, pas encore créé', tip: "Le joueur indique que ce perso n'existe pas encore en jeu. Il sera vérifié tout seul une fois créé." };
		if (status === 'missing' || character.armoryStatus === 'missing')
			return {
				kind: 'missing',
				icon: '⚠',
				label: 'pas trouvé en jeu',
				tip:
					status === 'missing'
						? `Aucun perso de ce nom dans la guilde en jeu${sync}. Le prénom ou le nom de famille de la fiche est peut-être différent de celui du jeu, ou le perso n'est pas encore dans la guilde.`
						: "Introuvable dans le jeu (Armurerie de Blizzard) : nom mal orthographié, ou perso pas reconnecté au jeu depuis longtemps."
			};
		if (status === 'pending' && showPending)
			return { kind: 'pending', icon: '', label: 'pas encore vérifié en jeu', tip: 'Fiche créée après la dernière synchro : elle sera vérifiée à la prochaine.' };
		return null;
	});

	// Infobulle en position fixe : jamais coupée par un tableau qui défile. Souris : au survol ;
	// toucher : un appui l'ouvre, un autre la ferme ; clavier : au focus.
	let anchor = $state<HTMLElement>();
	let tip = $state<{ left: number; top: number; above: boolean } | null>(null);
	const id = `game-tip-${Math.random().toString(36).slice(2, 9)}`;

	function show() {
		if (!anchor) return;
		const r = anchor.getBoundingClientRect();
		const width = Math.min(288, window.innerWidth - 24);
		const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), window.innerWidth - width - 12);
		const above = r.bottom + 120 > window.innerHeight;
		tip = { left, top: above ? r.top - 8 : r.bottom + 8, above };
	}
	const hide = () => (tip = null);
</script>

<svelte:window onscroll={hide} onresize={hide} />

{#if badge}
	<button
		type="button"
		class="game {badge.kind}"
		bind:this={anchor}
		aria-describedby={tip ? id : undefined}
		onpointerenter={(e) => e.pointerType === 'mouse' && show()}
		onpointerleave={(e) => e.pointerType === 'mouse' && hide()}
		onfocus={() => anchor?.matches(':focus-visible') && show()}
		onblur={hide}
		onclick={(e) => ('pointerType' in e && e.pointerType === 'mouse') || (tip ? hide() : show())}
	>
		{#if badge.icon}{badge.icon}{/if}<span class="label">{badge.icon ? ' ' : ''}{badge.label}</span>
	</button>
	{#if tip}
		<span {id} role="tooltip" class="tip" class:above={tip.above} style:left="{tip.left}px" style:top="{tip.top}px">{badge.tip}</span>
	{/if}
{/if}

<style>
	.game {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		min-height: 0;
		padding: 0.0625rem 0.5rem;
		border: 0;
		border-radius: 999px;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		vertical-align: middle;
		cursor: help;
	}
	.game:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
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
		background: transparent;
		color: var(--muted);
		font-weight: 400;
	}
	.tip {
		position: fixed;
		z-index: 50;
		width: min(18rem, calc(100vw - 24px));
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		background: var(--surface);
		box-shadow: var(--shadow);
		color: var(--text);
		font-size: 0.8125rem;
		font-weight: 400;
		line-height: 1.45;
		white-space: normal;
		pointer-events: none;
	}
	.tip.above {
		transform: translateY(-100%);
	}
</style>
