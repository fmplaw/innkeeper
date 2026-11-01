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
		border: 1px solid color-mix(in srgb, var(--tone) 55%, transparent);
		background: color-mix(in srgb, var(--tone) 12%, transparent);
	}
	.essential {
		--tone: #e5534b;
	}
	.raid {
		--tone: #e3a03a;
	}
	.recommended {
		--tone: #56d364;
	}
	.useful {
		--tone: #58a6ff;
	}
</style>
