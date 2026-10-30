import { redirect } from '@sveltejs/kit';
import { signIn } from '../../auth';
import { getDiscord } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

const MESSAGES: Record<string, string> = {
	'non-membre': "Ton compte Discord n'est pas membre du serveur de la guilde.",
	'sans-role': "Tu es bien sur le serveur, mais aucun de tes rôles Discord ne donne accès au site.",
	AccessDenied: 'Connexion refusée.',
	Configuration: 'La connexion Discord est mal configurée. Préviens l’admin du site.'
};

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, '/persos');
	if (locals.candidate) redirect(303, '/postuler');
	const code = url.searchParams.get('erreur') ?? url.searchParams.get('error');
	return {
		message: code ? (MESSAGES[code] ?? 'La connexion a échoué, réessaie.') : null,
		discordReady: Boolean(getDiscord())
	};
};

export const actions: Actions = { default: signIn };
