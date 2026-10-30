import type { SubmitFunction } from '@sveltejs/kit';

/**
 * À utiliser avec `use:enhance` sur les formulaires qui affichent des valeurs enregistrées
 * (réglages, rôles…) : par défaut, SvelteKit remet le formulaire à zéro après un envoi
 * réussi, ce qui décoche les boutons radio et ramène des valeurs périmées.
 */
export const keepValues: SubmitFunction = () => {
	return async ({ update }) => update({ reset: false });
};
