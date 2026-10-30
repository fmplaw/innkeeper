<script lang="ts">
	import DiscordForm from '$lib/components/DiscordForm.svelte';

	let { data, form } = $props();
</script>

<p>
	Les joueurs se connectent avec leur compte Discord, et le site vérifie qu'ils sont membres du serveur de la guilde.
	Il faut pour cela une application Discord, gratuite, à créer une fois.
</p>

<DiscordForm
	values={form?.values ?? data.values}
	errors={form?.errors}
	redirectUrl={data.redirectUrl}
	submitLabel="Vérifier et continuer"
	skippable
/>
