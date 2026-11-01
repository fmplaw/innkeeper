<script lang="ts">
	import { page } from '$app/state';

	// Les messages d'erreur du site sont déjà en français ; ceux de SvelteKit (« Not Found »,
	// « Internal Error ») sont remplacés par une explication.
	const status = $derived(page.status);
	const message = $derived.by(() => {
		const raw = page.error?.message ?? '';
		if (status === 404 && (!raw || raw === 'Not Found')) return 'Cette page n’existe pas, ou plus.';
		if (status >= 500 && (!raw || raw === 'Internal Error')) return 'Une erreur inattendue est survenue. Réessaie dans un instant ; si elle revient, préviens un officier.';
		return raw;
	});
	const title = $derived(status === 404 ? 'Page introuvable' : status === 403 ? 'Accès réservé' : status >= 500 ? 'Oups, un souci' : 'Erreur');
</script>

<svelte:head><title>{title}</title></svelte:head>

<section class="card error-page">
	<p class="code">{status}</p>
	<h1>{title}</h1>
	<p>{message}</p>
	<div class="row">
		{#if status >= 500}<button onclick={() => location.reload()}>Réessayer</button>{/if}
		<a class="button secondary" href="/">Retour à l'accueil</a>
	</div>
</section>

<style>
	.error-page {
		max-width: 36rem;
		margin: 2rem auto;
		display: grid;
		gap: 0.75rem;
	}
	.code {
		margin: 0;
		font-size: 0.9rem;
		color: var(--muted);
		letter-spacing: 0.08em;
	}
	h1 {
		margin: 0;
		color: var(--gold);
	}
	p {
		margin: 0;
	}
	.row {
		margin-top: 0.5rem;
	}
</style>
