<script lang="ts">
	// Anneau de répartition, pour quelques parts seulement (au-delà, des barres se lisent mieux).
	let { parts, label }: { parts: { label: string; value: number; color: string }[]; label: string } = $props();

	const R = 15.9155; // circonférence de 100 : les longueurs de trait sont des pourcentages
	const total = $derived(parts.reduce((n, p) => n + p.value, 0));
	const arcs = $derived.by(() => {
		let offset = 0;
		return parts.map((p) => {
			const pct = total ? (p.value / total) * 100 : 0;
			const arc = { ...p, pct, offset };
			offset += pct;
			return arc;
		});
	});
</script>

<figure class="donut">
	<svg viewBox="0 0 42 42" role="img" aria-label="{label} : {parts.map((p) => `${p.label} ${p.value}`).join(', ')}">
		<circle cx="21" cy="21" r={R} fill="none" stroke="var(--surface-2)" stroke-width="6" />
		{#each arcs as a (a.label)}
			{#if a.pct}
				<circle
					cx="21"
					cy="21"
					r={R}
					fill="none"
					stroke={a.color}
					stroke-width="6"
					stroke-dasharray="{a.pct} {100 - a.pct}"
					stroke-dashoffset={25 - a.offset}
				/>
			{/if}
		{/each}
		<text x="21" y="22.5" text-anchor="middle" fill="var(--text)">{total}</text>
	</svg>
	<figcaption>
		{#each parts as p (p.label)}
			<span><i style:background={p.color}></i>{p.label} <strong>{p.value}</strong></span>
		{/each}
	</figcaption>
</figure>

<style>
	.donut {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem 1.5rem;
	}
	svg {
		width: 8.5rem;
		height: 8.5rem;
		flex: none;
	}
	text {
		font-size: 0.55rem;
		font-weight: 600;
	}
	figcaption {
		display: grid;
		gap: 0.35rem;
		font-size: 0.9rem;
	}
	figcaption span {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	figcaption strong {
		font-variant-numeric: tabular-nums;
	}
	i {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 2px;
		flex: none;
	}
</style>
