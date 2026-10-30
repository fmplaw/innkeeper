<script lang="ts">
	import GuildForm from '$lib/components/GuildForm.svelte';

	let { data, form } = $props();
</script>

<h1>Profil de la guilde</h1>
{#if form?.saved}<p class="card saved">Profil enregistré.</p>{/if}

<!-- Clé : remonte le formulaire après enregistrement (nouveau logo, nouvelles valeurs). -->
{#key data.guild}
	<GuildForm
		values={form?.values ?? data.guild ?? undefined}
		errors={form?.errors}
		timezones={data.timezones}
		submitLabel="Enregistrer"
	/>
{/key}

<style>
	.saved {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
</style>
