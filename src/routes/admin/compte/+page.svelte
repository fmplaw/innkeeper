<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Compte admin local</h1>
<p class="muted">Identifiant : <strong>{data.username}</strong></p>
{#if form?.saved}<p class="card ok">Mot de passe changé. Les autres sessions admin ont été déconnectées.</p>{/if}

<form method="POST" class="card form">
	<div>
		<label for="current">Mot de passe actuel</label>
		<input id="current" name="current" type="password" required autocomplete="current-password" />
		{#if form?.errors?.current}<p class="error">{form.errors.current}</p>{/if}
	</div>
	<div>
		<label for="password">Nouveau mot de passe (12 caractères min.)</label>
		<input id="password" name="password" type="password" required minlength="12" autocomplete="new-password" />
		{#if form?.errors?.password}<p class="error">{form.errors.password}</p>{/if}
	</div>
	<div>
		<label for="confirm">Confirmation</label>
		<input id="confirm" name="confirm" type="password" required minlength="12" autocomplete="new-password" />
		{#if form?.errors?.confirm}<p class="error">{form.errors.confirm}</p>{/if}
	</div>
	<div class="row"><button>Changer le mot de passe</button></div>
</form>

<style>
	.form {
		display: grid;
		gap: 1rem;
		max-width: 28rem;
	}
	.ok {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
</style>
