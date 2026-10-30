<script lang="ts">
	let { form } = $props();
</script>

<form method="POST" action="?/login" class="card login">
	<h1>Admin de l'instance</h1>
	<p class="muted">Connexion locale, hors Discord. Les joueurs et officiers se connectent avec Discord.</p>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<div>
		<label for="username">Identifiant</label>
		<input id="username" name="username" required autocomplete="username" value={form?.username ?? ''} />
	</div>
	<div>
		<label for="password">Mot de passe</label>
		<input id="password" name="password" type="password" required autocomplete="current-password" />
	</div>
	<button>Se connecter</button>
</form>

<style>
	.login {
		max-width: 26rem;
		margin: 3rem auto;
		display: grid;
		gap: 0.9rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	p {
		margin: 0;
	}
</style>
