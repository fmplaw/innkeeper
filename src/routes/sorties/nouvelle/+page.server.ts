import { error, fail, redirect } from '@sveltejs/kit';
import { ACTIVITIES } from '$lib/activities';
import { INSTANCES } from '$lib/game/forever';
import { activityImageUrl } from '$lib/server/activity-images';
import { audit } from '$lib/server/audit';
import { BotError, botReady, textChannels } from '$lib/server/bot';
import { requireViewer } from '$lib/server/guards';
import {
	advancedSettings,
	forgetDiscovered,
	getTemplate,
	listTemplates,
	MAX_UPCOMING_MEMBER_OUTINGS,
	memberActivityAllowed,
	nextWeekday,
	officers,
	outingSchema,
	raidHelperDate,
	recordOuting,
	today,
	upcomingMemberOutings,
	zonedToUnix,
	type OutingKind
} from '$lib/server/outings';
import { createEvent, RaidHelperError } from '$lib/server/raidhelper';
import { isOfficer } from '$lib/server/rosters';
import { getActivityImages, getDiscord, getGuild, getRaidHelper } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

// Modèle Raid-Helper des événements : rôles et spés de WoW Forever.
const RAID_HELPER_TEMPLATE = 'wowforever';

const timezone = () => getGuild()?.timezone ?? 'Europe/Paris';

/**
 * Qui peut créer quoi. Officiers : sorties officielles, et sorties membres s'ils ont un
 * compte Discord. Membres : sorties membres seulement, si le salon dédié est choisi.
 */
function permissions(locals: App.Locals) {
	const settings = getRaidHelper();
	const officer = isOfficer(locals);
	const kinds: OutingKind[] = [];
	if (officer) kinds.push('official');
	if (locals.user && settings.memberChannelId) kinds.push('member');
	return { settings, officer, kinds };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireViewer(locals);
	const { settings, officer, kinds } = permissions(locals);
	if (!settings.apiKey) redirect(303, officer ? '/admin/sorties' : '/sorties');
	if (kinds.length === 0) error(403, 'Les sorties des membres ne sont pas encore ouvertes : il manque leur salon (Admin → Sorties).');

	let channels: { id: string; name: string }[] = [];
	let channelsError: string | null = null;
	if (botReady()) {
		try {
			channels = (await textChannels()).map((c) => ({ id: c.id, name: c.name }));
		} catch (e) {
			channelsError = e instanceof BotError ? e.message : 'Discord ne répond pas.';
		}
	}

	// Valeurs de départ : modèle choisi (?modele=<id>, sorties officielles), sinon formulaire vierge.
	const template = officer && url.searchParams.get('modele') ? getTemplate(Number(url.searchParams.get('modele'))) : undefined;
	const tz = timezone();
	const remaining = locals.user && !officer ? MAX_UPCOMING_MEMBER_OUTINGS - upcomingMemberOutings(locals.user.id) : null;
	return {
		kinds,
		memberChannel: channels.find((c) => c.id === settings.memberChannelId)?.name ?? null,
		remaining,
		templates: officer ? listTemplates().map((t) => ({ id: t.id, name: t.name })) : [],
		template: template?.id ?? null,
		activities: ACTIVITIES,
		images: Object.fromEntries(Object.entries(getActivityImages()).map(([key, file]) => [key, `/images/sorties/${file}`])),
		instances: INSTANCES,
		values: {
			kind: kinds[0],
			activity: template?.activity ?? '',
			instanceId: template?.instanceId ?? '',
			title: template?.title ?? '',
			description: template?.description ?? '',
			date: template?.weekday ? nextWeekday(template.weekday, tz) : today(tz),
			time: template?.time ?? '21:00',
			channelId: template?.channelId ?? settings.defaultChannelId ?? '',
			leaderId: locals.user?.id ?? '',
			rosterId: template?.rosterId ?? null
		},
		today: today(tz),
		timezone: tz,
		officers: officer ? officers() : [],
		channels,
		channelsError
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		requireViewer(locals);
		const { settings, kinds } = permissions(locals);
		const form = await request.formData();
		// Type demandé ; à défaut, le premier permis (un membre ne peut proposer que des sorties membres).
		const asked = form.get('kind');
		const kind: OutingKind = asked === 'member' || asked === 'official' ? asked : kinds[0];
		if (!kinds.includes(kind)) return fail(403, { error: 'Tu ne peux pas créer ce type de sortie.' });

		// Sortie membre : salon dédié et organisateur imposés, quoi que dise le formulaire.
		const fields = Object.fromEntries(['activity', 'instanceId', 'title', 'description', 'date', 'time', 'channelId', 'leaderId'].map((k) => [k, form.get(k) ?? '']));
		if (kind === 'member') Object.assign(fields, { channelId: settings.memberChannelId, leaderId: locals.user!.id });
		const parsed = outingSchema.safeParse(fields);
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const o = parsed.data;

		if (kind === 'member') {
			if (!memberActivityAllowed(o.activity)) return fail(400, { error: 'Les raids sont organisés par les officiers.' });
			if (!isOfficer(locals) && upcomingMemberOutings(locals.user!.id) >= MAX_UPCOMING_MEMBER_OUTINGS) {
				return fail(400, { error: `Tu as déjà ${MAX_UPCOMING_MEMBER_OUTINGS} sorties à venir : attends qu'une soit passée, ou supprimes-en une.` });
			}
		}

		const guildId = getDiscord()?.guildId;
		if (!settings.apiKey || !guildId) return fail(400, { error: 'Raid-Helper n’est pas configuré (Admin → Sorties).' });
		const startTime = zonedToUnix(o.date, o.time, timezone());
		if (startTime < Date.now() / 1000) return fail(400, { error: 'Cette date est déjà passée.' });
		let id: string;
		try {
			id = await createEvent(guildId, settings.apiKey, {
				channelId: o.channelId,
				leaderId: o.leaderId,
				templateId: RAID_HELPER_TEMPLATE,
				title: o.title,
				description: o.description,
				date: raidHelperDate(o.date),
				time: o.time,
				startTime,
				// Événement Discord : sorties officielles seulement, si la guilde l'a activé.
				advancedSettings: advancedSettings(o.activity, o.instanceId, activityImageUrl(o.activity, o.instanceId), kind === 'official' && settings.discordEvents)
			});
		} catch (e) {
			return fail(502, { error: e instanceof RaidHelperError ? e.message : 'Raid-Helper ne répond pas, réessaie dans un instant.' });
		}
		recordOuting({
			eventId: id,
			kind,
			createdBy: locals.user?.id ?? null,
			title: o.title,
			activity: o.activity,
			instanceId: o.instanceId,
			startTime: new Date(startTime * 1000)
		});
		forgetDiscovered();
		audit(locals, 'outing.create', { label: o.title, url: `/sorties/${id}` }, { date: `${o.date} ${o.time}`, genre: kind === 'member' ? 'sortie membre' : 'officielle' });
		const rosterId = kind === 'official' ? Number(form.get('rosterId')) : 0;
		redirect(303, `/sorties/${id}${rosterId ? `?roster=${rosterId}` : ''}`);
	}
};
