<script lang="ts">
	import GuildForm from '$lib/components/GuildForm.svelte';

	let { data, form } = $props();
</script>

<p>
	Dernière étape : présente ta guilde. Tout reste modifiable ensuite dans l'administration, et ces informations
	alimenteront la page publique du site.
</p>

<GuildForm values={form?.values} errors={form?.errors} timezones={data.timezones} submitLabel="Terminer l'installation" />
