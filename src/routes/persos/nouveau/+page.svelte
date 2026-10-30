<script lang="ts">
	import CharacterForm from '$lib/components/CharacterForm.svelte';

	let { data, form } = $props();
</script>

<h1>Nouveau perso{data.owner.self ? '' : ` pour ${data.owner.displayName}`}</h1>

<CharacterForm config={data.config} values={form?.values} errors={form?.errors} submitLabel="Créer"
	cancelHref={data.owner.self ? '/persos' : '/admin'}
	mainStatus={data.mainName ? 'reroll' : 'first'}
	mainName={data.mainName}
/>
