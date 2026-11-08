import { fail } from '@sveltejs/kit';
import { audit, diff } from '$lib/server/audit';
import { BotError, botReady, textChannels } from '$lib/server/bot';
import { requireOfficer } from '$lib/server/guards';
import { craftSchema, getCrafts, setCrafts } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireOfficer(locals);
	let channels: { id: string; name: string }[] = [];
	let channelsError: string | null = null;
	if (botReady()) {
		try {
			channels = (await textChannels()).map((c) => ({ id: c.id, name: c.name }));
		} catch (e) {
			channelsError = e instanceof BotError ? e.message : 'Discord ne répond pas.';
		}
	} else channelsError = 'Le bot n’est pas configuré (Admin → Connexion Discord) : les commandes resteront sur le site.';
	return { channelId: getCrafts().channelId, channels, channelsError };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		requireOfficer(locals);
		const parsed = craftSchema.safeParse({ channelId: (await request.formData()).get('channelId') ?? '' });
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const current = getCrafts();
		setCrafts(parsed.data);
		audit(locals, 'crafts.update', { label: 'Commandes de craft', url: '/admin/commandes' }, diff(current, parsed.data, ['channelId']));
		return { saved: true };
	}
};
