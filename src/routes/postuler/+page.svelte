<script lang="ts">
	import CharacterForm from '$lib/components/CharacterForm.svelte';
	import RichText from '$lib/components/RichText.svelte';

	let { data, form } = $props();
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
</script>

<h1>Rejoindre {data.config.guild.name}</h1>

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
			{#if data.config.hasCharter}
				<p>Avant de postuler, prends le temps de lire <a href="/charte">la charte de la guilde</a> : il faudra l'accepter.</p>
			{/if}
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
			{#if data.charter}
				<fieldset class="questions charter">
					<legend>Charte et règlement</legend>
					<p class="muted">Lis la charte de la guilde : tu t'engages à la respecter en rejoignant la guilde.</p>
					<!-- Zone qui défile : focusable pour la lire au clavier. -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div class="charter-text" tabindex="0" role="region" aria-label="Charte et règlement">
						<RichText text={data.charter.text} document />
					</div>
					<label class="accept">
						<input type="checkbox" name="charter" required checked={form?.charter ?? false} />
						J'ai lu la charte et je m'engage à la respecter *
					</label>
					{#if form?.errors?.charter}<p class="error">{form.errors.charter}</p>{/if}
				</fieldset>
			{/if}
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
	.charter-text {
		max-height: 22rem;
		overflow-y: auto;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
	}
	.charter-text:focus-visible {
		outline: 2px solid var(--accent);
	}
	.accept {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text);
		font-size: 0.95rem;
	}
	.accept input {
		width: auto;
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
