<script lang="ts">
	import { AXIS_LABELS, INTEREST_AXES, LEVEL_LABELS, type InterestLevel } from '$lib/interests';

	let { pve, pvp, compact = false }: { pve: InterestLevel | null; pvp: InterestLevel | null; compact?: boolean } =
		$props();
	const values = $derived({ pve, pvp });
</script>

{#each INTEREST_AXES as axis (axis)}
	{@const level = values[axis]}
	{#if level}
		<span class="interest {level}" title="{AXIS_LABELS[axis]} {LEVEL_LABELS[level].toLowerCase()}">
			{AXIS_LABELS[axis]}{compact ? '' : ` ${LEVEL_LABELS[level].toLowerCase()}`}{compact && level === 'competitive' ? ' ★' : ''}
		</span>
	{/if}
{/each}

<style>
	.interest {
		display: inline-block;
		padding: 0.0625rem 0.5625rem;
		border-radius: 999px;
		font-size: 0.8125rem;
		font-weight: 500;
		background: color-mix(in oklab, var(--good) 11%, var(--bg));
		color: var(--good);
		white-space: nowrap;
	}
	.interest.competitive {
		background: var(--tint);
		color: var(--accent-ink);
	}
	.interest + .interest {
		margin-left: 0.3rem;
	}
</style>
