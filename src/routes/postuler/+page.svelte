<script lang="ts">
	import CharacterForm from '$lib/components/CharacterForm.svelte';

	let { data, form } = $props();
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
</script>

<h1>Postuler au {data.config.guild.name}</h1>

{#if data.state === 'member'}
	<p class="card">Tu fais déjà partie de la guilde. <a href="/persos">Gère tes persos</a>.</p>
{:else if data.state === 'anonymous'}
	<section class="card intro">
		{#if !data.open}
			<p>Le recrutement est fermé pour le moment. Repasse plus tard !</p>
		{:else}
			<p>
				Pour postuler, connecte-toi avec ton compte Discord : pas besoin d'être déjà sur notre serveur. Tu
				présenteras le perso que tu comptes jouer et tu répondras à quelques questions. Les officiers examinent
				chaque candidature, et tu peux suivre la tienne ici.
			</p>
			{#if data.discordReady}
				<form method="POST" action="/connexion">
					<input type="hidden" name="providerId" value="discord" />
					<input type="hidden" name="redirectTo" value="/postuler" />
					<button>Se connecter avec Discord pour postuler</button>
				</form>
			{:else}
				<p class="error">La connexion Discord n'est pas encore configurée.</p>
			{/if}
		{/if}
	</section>
{:else if data.state === 'closed'}
	<p class="card">Le recrutement est fermé pour le moment. Repasse plus tard !</p>
{:else if data.state === 'cooldown'}
	<p class="card">
		Ta dernière candidature n'a pas été retenue. Tu pourras en déposer une nouvelle à partir du
		<strong>{dateFormat.format(data.until)}</strong>.
	</p>
{:else}
	<p class="muted lead">
		Présente le perso que tu comptes jouer avec nous, puis réponds aux questions. Tu pourras suivre ta candidature
		juste après.
	</p>
	<CharacterForm
		config={data.config}
		values={form?.values ?? undefined}
		errors={form?.errors}
		submitLabel="Envoyer ma candidature"
		cancelHref={null}
	>
		{#snippet extra()}
			<fieldset class="questions">
				<legend>Quelques questions</legend>
				{#each data.questions as question, i (i)}
					<div>
						<label for="answer-{i}">{question} *</label>
						<textarea id="answer-{i}" name="answer-{i}" rows="3" maxlength="2000" required>{form?.answers?.[i] ?? ''}</textarea>
						{#if form?.errors?.[`answer-${i}`]}<p class="error">{form.errors[`answer-${i}`]}</p>{/if}
					</div>
				{/each}
			</fieldset>
		{/snippet}
	</CharacterForm>
{/if}

<style>
	.intro {
		display: grid;
		gap: 1rem;
		max-width: 46rem;
	}
	.intro p {
		margin: 0;
	}
	.lead {
		max-width: 65ch;
	}
	.questions {
		border: 1px solid var(--border);
		border-radius: 6px;
		display: grid;
		gap: 0.9rem;
	}
	.questions legend {
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
