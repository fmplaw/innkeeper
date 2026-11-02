<script lang="ts">
	import { IMPORTANCE_INFO, type AddonImportance } from '$lib/addons';

	// Pastille d'importance d'un addon : rouge, orange, vert, bleu ou neutre.
	let { importance }: { importance: AddonImportance } = $props();
</script>

<span class="importance {importance}">{IMPORTANCE_INFO[importance].label}</span>

<style>
	.importance {
		--tone: var(--muted);
		display: inline-block;
		padding: 0.05rem 0.55rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
		color: var(--tone);
		background: color-mix(in oklab, var(--tone) 12%, var(--bg));
	}
	.essential {
		--tone: var(--danger);
	}
	.raid {
		--tone: var(--warn);
	}
	.recommended {
		--tone: var(--good);
	}
	.useful {
		--tone: #58a6ff;
	}
</style>
