<script lang="ts">
	let { data } = $props();
</script>

<div class="card login">
	<h1>Connexion</h1>
	{#if data.message}<p class="error">{data.message}</p>{/if}
	<p class="muted">L'accès est réservé aux membres du serveur Discord de la guilde.</p>
	{#if !data.discordReady}
		<p class="error">La connexion Discord n'est pas encore configurée par l'admin du site.</p>
	{:else}
	<form method="POST">
		<input type="hidden" name="providerId" value="discord" />
		<input type="hidden" name="redirectTo" value="/persos" />
		<button>Se connecter avec Discord</button>
	</form>
	<p class="reassure muted">
		Tu seras redirigé vers <strong>discord.com</strong> pour te connecter : le site ne voit jamais ton mot de passe.
		<a href="/confidentialite">Ce que le site récupère</a>
	</p>
	{/if}
	<p class="admin-link"><a href="/admin/connexion" class="muted">Connexion admin de l'instance</a></p>
</div>

<style>
	.reassure {
		margin: 1rem 0 0;
		font-size: 0.88rem;
	}
	.admin-link {
		margin: 1.5rem 0 0;
		font-size: 0.85rem;
	}
	.login {
		max-width: 28rem;
		margin: 3rem auto;
		text-align: center;
	}
</style>
