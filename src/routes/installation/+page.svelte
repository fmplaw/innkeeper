<script lang="ts">
	let { form } = $props();
</script>

<form method="POST" class="card form">
	<p>
		Bienvenue ! Commence par créer le <strong>compte admin local</strong> de cette instance. Il sert à configurer le
		site et reste utilisable si la connexion Discord ne fonctionne plus. Les joueurs, eux, se connecteront avec Discord.
	</p>

	<div>
		<label for="code">Code d'installation *</label>
		<input id="code" name="code" required autocomplete="off" />
		<p class="muted small">
			Il est affiché dans les logs du conteneur au démarrage (<code>docker compose logs</code>).
		</p>
		{#if form?.errors?.code}<p class="error">{form.errors.code}</p>{/if}
	</div>
	<div>
		<label for="username">Identifiant *</label>
		<input id="username" name="username" required autocomplete="username" value={form?.values?.username ?? 'admin'} />
		{#if form?.errors?.username}<p class="error">{form.errors.username}</p>{/if}
	</div>
	<div class="grid">
		<div>
			<label for="password">Mot de passe * (12 caractères min.)</label>
			<input id="password" name="password" type="password" required minlength="12" autocomplete="new-password" />
			{#if form?.errors?.password}<p class="error">{form.errors.password}</p>{/if}
		</div>
		<div>
			<label for="confirm">Confirmation *</label>
			<input id="confirm" name="confirm" type="password" required minlength="12" autocomplete="new-password" />
			{#if form?.errors?.confirm}<p class="error">{form.errors.confirm}</p>{/if}
		</div>
	</div>
	<div class="row"><button>Créer le compte admin</button></div>
</form>

<style>
	.form {
		display: grid;
		gap: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 1rem;
	}
	.small {
		font-size: 0.85rem;
		margin: 0.3rem 0 0;
	}
	code {
		background: var(--surface-2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
	}
</style>
