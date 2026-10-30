import { fail, redirect } from '@sveltejs/kit';
import { discordFormValues, parseDiscordForm } from '$lib/server/discord-form';
import { audit } from '$lib/server/audit';
import { requireLocalAdmin } from '$lib/server/guards';
import { getDiscord, isSetupComplete, setDiscord } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (isSetupComplete()) redirect(303, '/admin/discord');
	requireLocalAdmin(locals);
	return { values: discordFormValues(getDiscord()), redirectUrl: `${url.origin}/auth/callback/discord` };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireLocalAdmin(locals);
		const before = getDiscord();
		const parsed = await parseDiscordForm(await request.formData(), before);
		if (!parsed.data) return fail(400, { errors: parsed.errors, values: parsed.values });
		setDiscord(parsed.data);
		audit(locals, 'discord.update', undefined, {
			application: before?.clientId !== parsed.data.clientId ? parsed.data.clientId : undefined,
			serveur: before?.guildId !== parsed.data.guildId ? parsed.data.guildId : undefined,
			cleSecrete: before?.clientSecret !== parsed.data.clientSecret ? 'changée' : undefined,
			bot: before?.botToken !== parsed.data.botToken ? (parsed.data.botToken ? 'jeton changé' : 'retiré') : undefined
		});
		redirect(303, '/installation/guilde');
	},
	skip: ({ locals }) => {
		requireLocalAdmin(locals);
		redirect(303, '/installation/guilde');
	}
};
