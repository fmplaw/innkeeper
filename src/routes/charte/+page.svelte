<script lang="ts">
	import RichText from '$lib/components/RichText.svelte';

	let { data } = $props();
	const dayFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
</script>

<svelte:head><title>Charte et règlement · {data.config.guild.name}</title></svelte:head>

<div class="page-head"><h1>Charte et règlement</h1></div>

<article class="card charter">
	{#if data.charter}
		<RichText text={data.charter.text} document />
		{#if data.charter.updatedAt}
			<p class="muted updated">Mise à jour le {dayFormat.format(data.charter.updatedAt)}.</p>
		{/if}
	{:else}
		<p class="muted">La guilde n'a pas encore publié sa charte.</p>
	{/if}
</article>

<style>
	.charter {
		padding: 2rem clamp(1.25rem, 3vw, 2.5rem);
	}
	.updated {
		margin: 1.5rem 0 0;
		font-size: 0.85rem;
	}
</style>
