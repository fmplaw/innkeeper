<script lang="ts">
	import CharacterForm from '$lib/components/CharacterForm.svelte';
	import { fullName } from '$lib/labels';

	let { data, form } = $props();
</script>

<h1>Modifier {fullName(data.character)}</h1>

{#if form?.message}<p class="card error">{form.message}</p>{/if}

<CharacterForm
	config={data.config}
	values={form?.values ?? data.character}
	errors={form?.errors}
	action="?/save"
	submitLabel="Enregistrer"
	cancelHref={data.character.userId === data.user?.id ? '/persos' : '/admin'}
	mainStatus={data.character.isMain ? 'current' : 'reroll'}
	mainName={data.mainName}
/>

<form
	method="POST"
	action="?/delete"
	class="delete"
	onsubmit={(e) => {
		if (!window.confirm(`Supprimer ${data.character.name} ?`)) e.preventDefault();
	}}
>
	<button class="danger">Supprimer ce perso</button>
</form>

<style>
	.delete {
		margin-top: 1.5rem;
	}
</style>
