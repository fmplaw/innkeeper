import { redirect } from '@sveltejs/kit';
import { requireViewer } from '$lib/server/guards';
import { upcomingOutings } from '$lib/server/outings';
import { parseEventId } from '$lib/server/raidhelper';
import { isOfficer } from '$lib/server/rosters';
import { getGuild, getRaidHelper } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireViewer(locals);
	const input = url.searchParams.get('evenement');
	if (input) {
		const id = parseEventId(input);
		if (id) redirect(303, `/sorties/${id}`);
	}

	// Sorties à venir : API Raid-Helper si la clé est configurée, sinon le bot parcourt les salons.
	const { events, error: eventsError, source } = await upcomingOutings();
	const { apiKey, memberChannelId } = getRaidHelper();
	// Sorties membres : celles du salon dédié ; tout le reste est officiel.
	const isMember = (e: { channelId: string | null }) => Boolean(memberChannelId && e.channelId === memberChannelId);
	return {
		invalid: Boolean(input),
		deleted: url.searchParams.has('supprimee'),
		official: events?.filter((e) => !isMember(e)) ?? null,
		member: memberChannelId ? (events?.filter(isMember) ?? null) : null,
		eventsError,
		source,
		timezone: getGuild()?.timezone ?? 'Europe/Paris',
		canCreate: isOfficer(locals) && Boolean(apiKey),
		canPropose: Boolean(locals.user && apiKey && memberChannelId)
	};
};
