<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<h1>Compte admin local</h1>
<p class="muted">Identifiant : <strong>{data.username}</strong></p>

{#if data.mustChangePassword}
	<p class="card warn">
		Bienvenue ! Ton compte a été créé avec un <strong>mot de passe provisoire</strong> : choisis le tien pour accéder au reste
		de l'admin.
	</p>
{/if}
{#if form?.saved}<p class="card ok">Mot de passe changé. Les autres sessions admin ont été déconnectées.</p>{/if}

<form method="POST" action="?/password" class="card form">
	<h2>{data.mustChangePassword ? 'Choisis ton mot de passe' : 'Changer de mot de passe'}</h2>
	<div>
		<label for="current">{data.mustChangePassword ? 'Mot de passe provisoire' : 'Mot de passe actuel'}</label>
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

{#if !data.mustChangePassword}
	<section class="card admins">
		<h2>Admins de l'instance</h2>
		<p class="muted small">
			Un admin a tous les droits, sans être officier : candidatures et votes, notes des officiers, journal, connexion
			Discord et jeton du bot, clé Raid-Helper, rôles Discord. Chacun a son propre compte : le journal dit qui a fait quoi.
		</p>

		<ul>
			{#each data.admins as a (a.id)}
				<li>
					<span>
						<strong>{a.username}</strong>
						{#if a.id === data.adminId}<span class="badge">toi</span>{/if}
						{#if a.mustChangePassword}<span class="badge pending">mot de passe provisoire</span>{/if}
						<span class="muted small">
							{a.createdBy ? `ajouté par ${a.createdBy}` : 'compte de l’installation'}{a.createdAt ? `, le ${day.format(a.createdAt)}` : ''}
						</span>
					</span>
					{#if a.id !== data.adminId && data.admins.length > 1}
						<form
							method="POST"
							action="?/remove"
							use:enhance={({ cancel }) => {
								if (!window.confirm(`Retirer l'admin ${a.username} ? Ses sessions sont fermées tout de suite.`)) cancel();
							}}
						>
							<input type="hidden" name="id" value={a.id} />
							<button class="danger small-button">Retirer</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		{#if form?.removeError}<p class="error">{form.removeError}</p>{/if}
		{#if form?.removed}<p class="ok-text">Admin {form.removed} retiré.</p>{/if}

		{#if form?.added}
			<div class="card created">
				<p>
					Compte <strong>{form.added.username}</strong> créé. Transmets-lui ce mot de passe provisoire par un moyen privé (il
					ne sera plus affiché) ; il devra le changer à sa première connexion sur <code>/admin/connexion</code> :
				</p>
				<p class="secret"><code>{form.added.password}</code></p>
			</div>
		{/if}

		<form method="POST" action="?/add" class="row add" use:enhance>
			<div>
				<label for="username">Ajouter un admin : identifiant</label>
				<input id="username" name="username" required pattern={'[a-zA-Z0-9._\\-]{3,32}'} value={form?.username ?? ''} autocomplete="off" />
				{#if form?.addError}<p class="error">{form.addError}</p>{/if}
			</div>
			<button>Créer le compte</button>
		</form>
	</section>
{/if}

<style>
	.form {
		display: grid;
		gap: 1rem;
		max-width: 28rem;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.ok,
	.warn {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.admins {
		display: grid;
		gap: 0.75rem;
		margin-top: 1.5rem;
		max-width: 40rem;
	}
	.admins p {
		margin: 0;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--border);
	}
	li > span {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.badge.pending {
		color: var(--gold);
	}
	.small {
		font-size: 0.85rem;
	}
	.small-button {
		padding: 0.25rem 0.65rem;
		font-size: 0.85rem;
	}
	.add {
		align-items: flex-end;
		gap: 0.75rem;
	}
	.add input {
		width: auto;
	}
	.created {
		border-color: var(--gold);
		display: grid;
		gap: 0.5rem;
	}
	.secret code {
		font-size: 1.05rem;
		user-select: all;
	}
	.ok-text {
		color: var(--gold);
	}
</style>
