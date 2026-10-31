<script lang="ts">
	import { enhance } from '$app/forms';
	import RichText from '$lib/components/RichText.svelte';

	let { data, form } = $props();
	// svelte-ignore state_referenced_locally
	let text = $state(form?.text ?? data.charter?.text ?? '');
	let saving = $state(false);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
</script>

<h1>Charte et règlement</h1>
<p class="muted intro">
	Publiée sur la page <a href="/charte">Charte</a>, visible de tous, même sans connexion. Quand elle existe, les
	candidats doivent la lire et l'accepter pour postuler.
	{#if data.charter?.updatedAt}
		Dernière modification le {dateFormat.format(data.charter.updatedAt)}{#if data.charter.updatedBy}{' '}par {data.charter.updatedBy}{/if}.
	{/if}
</p>

{#if form?.saved}<p class="card saved">Charte enregistrée.</p>{/if}

<form
	method="POST"
	class="editor"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<div class="card write">
		<label for="text">Texte</label>
		<textarea id="text" name="text" rows="24" maxlength="20000" bind:value={text}></textarea>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<p class="muted help">
			<code># Titre</code>, <code>## Sous-titre</code>, <code>- élément de liste</code>, <code>**gras**</code>,
			<code>*italique*</code>. Une ligne vide sépare les paragraphes. Laisser vide retire la charte.
		</p>
		<div class="row">
			<button disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
			<span class="muted small">{text.length} / 20 000</span>
		</div>
	</div>
	<section class="card preview" aria-label="Aperçu">
		<p class="label muted">Aperçu</p>
		{#if text.trim()}
			<RichText {text} document />
		{:else}
			<p class="muted">Rien à afficher : la page Charte indiquera que la guilde n'en a pas encore publié.</p>
		{/if}
	</section>
</form>

<style>
	h1 {
		margin: 0 0 0.25rem;
	}
	.intro {
		margin: 0 0 1.25rem;
		max-width: 60rem;
	}
	.saved {
		margin: 0 0 1rem;
		border-color: color-mix(in srgb, #3fb950 50%, var(--border));
	}
	.editor {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
		gap: 1.5rem;
		align-items: start;
	}
	.write {
		display: grid;
		gap: 0.6rem;
	}
	textarea {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.88rem;
		line-height: 1.5;
		resize: vertical;
	}
	.help {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.7;
	}
	code {
		background: var(--surface-2);
		padding: 0.05rem 0.35rem;
		border-radius: 4px;
		color: var(--text);
	}
	.small {
		font-size: 0.85rem;
	}
	.preview {
		max-height: 70vh;
		overflow-y: auto;
	}
	.label {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
</style>
