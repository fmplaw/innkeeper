<script lang="ts">
	// Blason de la guilde ; sans logo envoyé, un sigle neutre teinté par la couleur d'accent.
	let { src, size = 32 }: { src: string | null; size?: number } = $props();
</script>

{#if src}
	<img class="crest" {src} alt="" style:width="{size}px" style:height="{size}px" />
{:else}
	<span class="sigil" aria-hidden="true" style:width="{size * 0.8}px" style:height="{size * 0.8}px"></span>
{/if}

<style>
	.crest {
		flex: none;
		display: block;
		object-fit: contain;
		filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.5));
	}
	.sigil {
		flex: none;
		display: block;
		border-radius: 50%;
		background: linear-gradient(180deg, var(--gold) 0 50%, var(--accent) 50% 100%);
	}
</style>
