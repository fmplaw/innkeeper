import { fail } from '@sveltejs/kit';
import { botGuild, botInviteUrl } from '$lib/server/discord';
import { discordFormValues, parseDiscordForm } from '$lib/server/discord-form';
import { audit } from '$lib/server/audit';
import { requireInstanceAdmin } from '$lib/server/guards';
import { syncRolesFromBot } from '$lib/server/permissions';
import { getDiscord, getGuild, setDiscord } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireInstanceAdmin(locals);
	const discord = getDiscord();
	return {
		values: discordFormValues(discord),
		redirectUrl: `${url.origin}/auth/callback/discord`,
		guildName: getGuild()?.name ?? null,
		bot: discord && {
			inviteUrl: botInviteUrl(discord.clientId, discord.guildId),
			configured: Boolean(discord.botToken),
			// Nom du serveur si le bot y est bien, null sinon.
			guildName: discord.botToken ? await botGuild(discord.botToken, discord.guildId).catch(() => null) : null
		}
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireInstanceAdmin(locals);
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

		// Avec un bot déjà présent sur le serveur, les rôles sont récupérés dans la foulée.
		let synced: number | null = null;
		if (parsed.data.botToken) synced = await syncRolesFromBot().catch(() => null);
		return { saved: true, synced, values: discordFormValues(parsed.data) };
	}
};
