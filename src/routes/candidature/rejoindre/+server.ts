import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import { exchangeCode, tokenOwner } from '$lib/server/discord';
import { joinWithToken, latestApplication } from '$lib/server/recruitment';
import { getDiscord } from '$lib/server/settings';
import type { RequestHandler } from './$types';

const STATE_COOKIE = 'join_state';

// Entrée sur le serveur Discord d'une recrue acceptée : autorisation `guilds.join`
// demandée à Discord, puis le bot la fait entrer lui-même, rôle d'arrivée compris.
export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const me = locals.candidate ?? locals.user;
	const app = me && latestApplication(me.id);
	const discord = getDiscord();
	if (!me || !app || app.status !== 'accepted' || app.roleAssignedAt || !discord) redirect(303, '/candidature');

	const redirectUri = `${url.origin}/candidature/rejoindre`;
	const code = url.searchParams.get('code');
	const back = (error: string) => redirect(303, `/candidature?arrivee=${encodeURIComponent(error)}`);

	if (!code) {
		if (url.searchParams.has('error')) back('Tu as refusé l’autorisation sur Discord. Tu peux réessayer, ou utiliser le lien d’invitation.');
		const state = randomBytes(16).toString('hex');
		cookies.set(STATE_COOKIE, state, { path: '/candidature/rejoindre', httpOnly: true, sameSite: 'lax', maxAge: 600 });
		const params = new URLSearchParams({
			client_id: discord.clientId,
			response_type: 'code',
			redirect_uri: redirectUri,
			scope: 'identify guilds.join',
			state
		});
		redirect(303, `https://discord.com/oauth2/authorize?${params}`);
	}

	const expected = cookies.get(STATE_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/candidature/rejoindre' });
	if (!expected || url.searchParams.get('state') !== expected) back('Lien expiré, recommence depuis cette page.');

	let token: string;
	try {
		token = (await exchangeCode(discord.clientId, discord.clientSecret, code, redirectUri)).access_token;
		// Le compte qui a autorisé doit être celui de la candidature.
		if ((await tokenOwner(token)) !== me.id) back('Tu as autorisé un autre compte Discord que celui de ta candidature.');
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		back('Discord ne répond pas, réessaie dans un instant.');
	}
	const error = await joinWithToken(app, token!);
	if (error) back(error);
	redirect(303, '/candidature');
};
