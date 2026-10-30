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
		padding: 0.05rem 0.55rem;
		border-radius: 999px;
		font-size: 0.8rem;
		border: 1px solid #3fb950;
		color: #56d364;
		white-space: nowrap;
	}
	.interest.competitive {
		border-color: var(--accent);
		color: color-mix(in srgb, var(--accent) 40%, white);
		background: color-mix(in srgb, var(--accent) 18%, transparent);
	}
	.interest + .interest {
		margin-left: 0.3rem;
	}
</style>
