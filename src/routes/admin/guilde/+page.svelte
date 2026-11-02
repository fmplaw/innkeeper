<script lang="ts">
	import { enhance } from '$app/forms';
	import ClassEmblem from '$lib/components/ClassEmblem.svelte';
	import GuildForm from '$lib/components/GuildForm.svelte';

	let { data, form } = $props();
	const cfg = $derived(data.config);
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
		action="?/save"
	/>
{/key}

<h2 class="section" id="icones">Icônes de classe</h2>
<p class="muted intro">
	Affichées à côté de chaque perso : Mes persos, roster, fiches des joueurs, candidatures. Sans icône, la classe garde
	son blason de couleur. Image carrée ou ronde sur fond transparent, PNG conseillé, au moins 128 × 128 px, 512 Ko
	maximum. Utilise des images que tu as le droit de diffuser sur le site de ta guilde.
</p>
<div class="icons">
	{#each cfg.classes as c (c.id)}
		<form method="POST" action="?/classIcon" enctype="multipart/form-data" use:enhance class="icon-card">
			<input type="hidden" name="classId" value={c.id} />
			{#if cfg.classIcons[c.id]}
				<ClassEmblem {cfg} classId={c.id} size={64} />
			{:else}
				<span class="placeholder muted small">Pas d'icône</span>
			{/if}
			<strong class="class-ink" style:--c={c.color}>{c.name}</strong>
			{#if form?.iconClass === c.id && form?.iconError}<p class="error small">{form.iconError}</p>{/if}
			<input type="file" name="icon" accept="image/png,image/jpeg,image/webp" aria-label="Icône pour {c.name}" onchange={(e) => e.currentTarget.form?.requestSubmit()} />
			{#if cfg.classIcons[c.id]}<button class="secondary small" name="remove" value="1" formnovalidate>Retirer</button>{/if}
		</form>
	{/each}
</div>

<style>
	.saved {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.section {
		margin-top: 2.5rem;
	}
	.intro {
		max-width: 65ch;
	}
	.icons {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.icon-card {
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 0.5rem;
		padding: 1rem 0.75rem;
		border-radius: var(--radius);
		background: var(--surface);
		text-align: center;
	}
	.placeholder {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--surface-2);
		text-align: center;
		line-height: 1.2;
	}
	.icon-card input[type='file'] {
		max-width: 100%;
		font-size: 0.8rem;
	}
	.small {
		font-size: 0.8rem;
	}
</style>
