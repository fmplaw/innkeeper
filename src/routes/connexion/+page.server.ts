import { fail, redirect } from '@sveltejs/kit';
import { signIn } from '../../auth';
import { DEMO_PROFILES, demoEnabled, enterDemo } from '$lib/server/demo';
import { getDiscord } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

const MESSAGES: Record<string, string> = {
	'non-membre': "Ton compte Discord n'est pas membre du serveur de la guilde.",
	'sans-role': "Tu es bien sur le serveur, mais aucun de tes rôles Discord ne donne accès au site.",
	AccessDenied: 'Connexion refusée.',
	Configuration: 'La connexion Discord est mal configurée. Préviens l’admin du site.'
};

export const load: PageServerLoad = ({ locals, url }) => {
	// En démo, on revient ici pour changer de profil.
	if (locals.user && !demoEnabled()) redirect(303, '/persos');
	if (locals.candidate && !demoEnabled()) redirect(303, '/postuler');
	const code = url.searchParams.get('erreur') ?? url.searchParams.get('error');
	return {
		message: code ? (MESSAGES[code] ?? 'La connexion a échoué, réessaie.') : null,
		discordReady: Boolean(getDiscord()),
		// Mode démo : choix d'un profil au lieu de Discord.
		demoProfiles: demoEnabled() ? DEMO_PROFILES.map(({ key, label, description }) => ({ key, label, description })) : null
	};
};

export const actions: Actions = {
	default: async (event) => {
		if (!demoEnabled()) return signIn(event);
		const key = String((await event.request.formData()).get('profile') ?? '');
		if (!enterDemo(event.cookies, key, event.url.protocol === 'https:')) return fail(400, { error: 'Profil inconnu.' });
		redirect(303, key === 'admin' ? '/admin' : key === 'candidate' ? '/candidature' : '/persos');
	}
};
