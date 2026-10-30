import { redirect } from '@sveltejs/kit';
import { botReady } from '$lib/server/bot';
import { ensureArrival, latestApplication, withdrawApplication } from '$lib/server/recruitment';
import type { Actions, PageServerLoad } from './$types';

// Suivi de sa candidature par le candidat (ou la recrue juste acceptée).
export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.candidate ?? locals.user;
	if (!me) redirect(303, '/postuler');
	let app = latestApplication(me.id);
	if (!app) redirect(303, '/postuler');

	// Recrue acceptée qui revient après avoir rejoint le serveur : le bot lui donne son rôle.
	let arrivalError: string | null = null;
	if (app.status === 'accepted' && !app.roleAssignedAt) {
		arrivalError = await ensureArrival(app);
		app = latestApplication(me.id)!;
	}
	return {
		app: {
			status: app.status,
			character: app.character,
			answers: app.answers,
			createdAt: app.createdAt,
			decidedAt: app.decidedAt,
			decisionMessage: app.decisionMessage,
			inviteUrl: app.inviteUrl,
			roleAssigned: Boolean(app.roleAssignedAt)
		},
		arrivalError,
		// Entrée directe par le bot, sans passer par le questionnaire d'entrée de Discord.
		canJoin: botReady(),
		joinError: url.searchParams.get('arrivee')
	};
};

export const actions: Actions = {
	withdraw: ({ locals }) => {
		const me = locals.candidate ?? locals.user;
		const app = me && latestApplication(me.id);
		if (app?.status === 'pending') withdrawApplication(app);
		redirect(303, '/postuler');
	}
};
