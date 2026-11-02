<script lang="ts">
	import Crest from '$lib/components/Crest.svelte';
	import Glyph from '$lib/components/Glyph.svelte';

	let { data } = $props();
</script>

<div class="login">
	<Crest src={data.config.guild.logoUrl} size={88} />
	<h1>Connexion</h1>
	{#if data.message}<p class="error">{data.message}</p>{/if}
	{#if data.demoProfiles}
		<p class="muted">Site de démonstration : choisis qui tu veux être. Tu pourras changer de profil à tout moment.</p>
		<div class="profiles">
			{#each data.demoProfiles as p (p.key)}
				<form method="POST">
					<input type="hidden" name="profile" value={p.key} />
					<button class="profile">
						<span class="who"><strong>{p.label}</strong><span>{p.description}</span></span>
						<Glyph name="arrow-right" size={18} />
					</button>
				</form>
			{/each}
		</div>
	{:else}
	<p class="muted">L'accès est réservé aux membres du serveur Discord de la guilde.</p>
	{#if !data.discordReady}
		<p class="error">La connexion Discord n'est pas encore configurée par l'admin du site.</p>
	{:else}
	<form method="POST">
		<input type="hidden" name="providerId" value="discord" />
		<input type="hidden" name="redirectTo" value="/persos" />
		<button class="discord"><Glyph name="message" size={18} /> Se connecter avec Discord</button>
	</form>
	<p class="reassure muted">
		Tu seras redirigé vers <strong>discord.com</strong> pour te connecter : le site ne voit jamais ton mot de passe.
		<a href="/confidentialite">Ce que le site récupère</a>
	</p>
	{/if}
	{/if}
	{#if !data.demoProfiles}<p class="admin-link"><a href="/admin/connexion" class="muted">Connexion admin de l'instance</a></p>{/if}
</div>

<style>
	.login {
		display: grid;
		justify-items: center;
		gap: 0.75rem;
		max-width: 32rem;
		margin: 2rem auto;
		text-align: center;
	}
	.login p {
		margin: 0;
	}
	.profiles {
		display: grid;
		gap: 0.5rem;
		width: 100%;
		margin-top: 1rem;
		text-align: left;
	}
	.profile {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		min-height: 64px;
		padding: 0.75rem 1.125rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: none;
		color: var(--text);
		text-align: left;
		white-space: normal;
	}
	.profile:hover {
		border-color: color-mix(in oklab, var(--accent) 50%, var(--border));
		filter: none;
	}
	.who {
		display: grid;
		gap: 0.125rem;
	}
	.who span {
		color: var(--muted);
		font-size: 0.875rem;
		font-weight: 400;
	}
	.discord {
		margin-top: 0.75rem;
		min-height: 48px;
		padding-inline: 1.5rem;
	}
	.reassure {
		margin-top: 0.75rem !important;
		font-size: 0.875rem;
	}
	.admin-link {
		margin-top: 1.5rem !important;
		font-size: 0.875rem;
	}
</style>
