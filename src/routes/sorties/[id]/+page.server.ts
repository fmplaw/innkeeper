import { error, fail, redirect } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { canManageOuting, deleteOutingRecord, forgetDiscovered, officers, outingEditSchema, unixToZoned, updateOutingRecord, zonedToUnix } from '$lib/server/outings';
import { listCharacters } from '$lib/server/characters';
import { getDiscord, getGuild, getRaidHelper } from '$lib/server/settings';
import { requireViewer } from '$lib/server/guards';
import { deleteEvent, editEvent, eventImage, fetchEvent, forgetEvent, parseEventId, RaidHelperError } from '$lib/server/raidhelper';
import { getRoster, isOfficer, listRosters } from '$lib/server/rosters';
import { buildComposition, compareWithRoster } from '$lib/server/sorties';
import { cancelSignup, mySignup, saveSignup, signupSchema, SIGNUP_STATUSES } from '$lib/server/signups';
import type { Actions, PageServerLoad } from './$types';

async function loadEvent(param: string, fresh = false) {
	const id = parseEventId(param);
	if (!id) error(404, 'Identifiant d’événement invalide');
	// Avant une inscription : état à jour, au cas où le membre vient de s'inscrire sur Discord.
	if (fresh) forgetEvent(id);
	let event;
	try {
		event = await fetchEvent(id);
	} catch (e) {
		console.error(e);
		error(502, 'Raid-Helper ne répond pas, réessaie dans un instant.');
	}
	// On ne sert que les événements du serveur de la guilde.
	if (!event || event.serverId !== getDiscord()?.guildId) error(404, 'Événement introuvable sur le serveur de la guilde');
	return event;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireViewer(locals);
	// « Actualiser » (?actualiser) : relecture immédiate, sans attendre la fin du cache d'une minute.
	const event = await loadEvent(params.id, url.searchParams.has('actualiser'));

	const when = new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'full',
		timeStyle: 'short',
		timeZone: getGuild()?.timezone ?? 'Europe/Paris'
	}).format(new Date(event.startTime * 1000));

	const composition = buildComposition(event);
	// Comparaison facultative avec un roster (?roster=<id>), parmi ceux visibles par l'utilisateur.
	const officer = isOfficer(locals);
	const roster = url.searchParams.get('roster') ? getRoster(Number(url.searchParams.get('roster')), officer) : undefined;

	// Inscription depuis le site : membre connecté avec Discord, clé API Raid-Helper configurée.
	const me = locals.user;
	const current = me ? mySignup(event, me.id) : null;
	const signup =
		me && getRaidHelper().apiKey && event.startTime > Date.now() / 1000
			? {
					characters: listCharacters(me.id).map((c) => ({
						id: c.id,
						name: c.name,
						class: c.class,
						spec: c.spec,
						role: c.role,
						spec2: c.spec2,
						role2: c.role2,
						isMain: c.isMain
					})),
					statuses: SIGNUP_STATUSES,
					current: current && { name: current.name, category: current.className, spec: current.specName ?? null }
				}
			: null;

	// Officiers : toutes les sorties ; membres : celles qu'ils ont proposées.
	const canManage = canManageOuting(locals, event.id) && Boolean(getRaidHelper().apiKey);
	const tz = getGuild()?.timezone ?? 'Europe/Paris';
	return {
		canDelete: canManage,
		edit: canManage
			? {
					values: { title: event.title, description: event.description ?? '', ...unixToZoned(event.startTime, tz), leaderId: event.leaderId ?? '' },
					// Seuls les officiers changent l'organisateur.
					officers: officer ? officers() : null,
					timezone: tz
				}
			: null,
		signup,
		rosters: listRosters(officer).map((r) => ({ id: r.id, name: r.name })),
		roster: roster ? { id: roster.id, name: roster.name, ...compareWithRoster(event, composition, roster.id) } : null,
		event: {
			id: event.id,
			title: event.displayTitle || event.title,
			description: event.description ?? '',
			leader: event.leaderName ?? '',
			image: eventImage(event),
			// Places : réglage Raid-Helper `limit` (9999 = illimité).
			limit: (() => {
				const limit = Number(event.advancedSettings?.limit);
				return limit > 0 && limit < 9999 ? limit : null;
			})(),
			when
		},
		composition
	};
};

const FIELD_LABELS = { title: 'titre', description: 'description', startTime: 'date et heure', leaderId: 'chef de raid' } as const;

export const actions: Actions = {
	edit: async ({ locals, params, request }) => {
		const { apiKey } = getRaidHelper();
		if (!canManageOuting(locals, params.id) || !apiKey) return fail(403, { editError: 'Réservé aux officiers et à l’organisateur.' });
		const form = await request.formData();
		const parsed = outingEditSchema.safeParse(Object.fromEntries(['title', 'description', 'date', 'time', 'leaderId'].map((k) => [k, form.get(k) ?? ''])));
		if (!parsed.success) return fail(400, { editError: parsed.error.issues[0].message });
		const event = await loadEvent(params.id, true);
		const o = parsed.data;
		const startTime = zonedToUnix(o.date, o.time, getGuild()?.timezone ?? 'Europe/Paris');
		const changes = { title: o.title, description: o.description, startTime, leaderId: isOfficer(locals) ? o.leaderId : (event.leaderId ?? o.leaderId) };
		let failed: string[];
		try {
			failed = await editEvent(event.id, apiKey, changes);
		} catch (e) {
			return fail(502, { editError: e instanceof RaidHelperError ? e.message : 'Raid-Helper ne répond pas, réessaie dans un instant.' });
		}
		forgetDiscovered();
		updateOutingRecord(event.id, { title: o.title, startTime: new Date(startTime * 1000) });
		if (failed.length) {
			return fail(502, { editError: `Raid-Helper n’a pas pris en compte : ${failed.map((k) => FIELD_LABELS[k as keyof typeof FIELD_LABELS]).join(', ')}.` });
		}
		const before = { title: event.title, description: event.description ?? '', startTime: event.startTime, leaderId: event.leaderId };
		const changed = Object.keys(changes).filter((k) => String(before[k as keyof typeof before]) !== String(changes[k as keyof typeof changes]));
		audit(locals, 'outing.update', { label: o.title, url: `/sorties/${event.id}` }, { champs: changed.map((k) => FIELD_LABELS[k as keyof typeof FIELD_LABELS]) });
		return { edited: true };
	},
	delete: async ({ locals, params }) => {
		const { apiKey } = getRaidHelper();
		if (!canManageOuting(locals, params.id) || !apiKey) return fail(403, { deleteError: 'Réservé aux officiers et à l’organisateur.' });
		const event = await loadEvent(params.id, true);
		try {
			if (!(await deleteEvent(event.id, apiKey))) return fail(502, { deleteError: 'Raid-Helper n’a pas supprimé la sortie, réessaie dans un instant.' });
		} catch (e) {
			return fail(502, { deleteError: e instanceof RaidHelperError ? e.message : 'Raid-Helper ne répond pas, réessaie dans un instant.' });
		}
		forgetDiscovered();
		deleteOutingRecord(event.id);
		audit(locals, 'outing.delete', { label: event.displayTitle || event.title }, { date: new Date(event.startTime * 1000).toISOString(), inscrits: event.signUps.length });
		redirect(303, '/sorties?supprimee=1');
	},
	signup: async ({ locals, params, request }) => {
		const me = locals.user;
		const { apiKey } = getRaidHelper();
		if (!me || !apiKey) return fail(403, { signupError: 'Inscription depuis le site indisponible.' });
		const parsed = signupSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { signupError: parsed.error.issues[0].message });
		const problem = await saveSignup(await loadEvent(params.id, true), apiKey, me.id, parsed.data);
		return problem ? fail(502, { signupError: problem }) : { signedUp: true };
	},
	cancel: async ({ locals, params }) => {
		const me = locals.user;
		const { apiKey } = getRaidHelper();
		if (!me || !apiKey) return fail(403, { signupError: 'Inscription depuis le site indisponible.' });
		const problem = await cancelSignup(await loadEvent(params.id, true), apiKey, me.id);
		return problem ? fail(502, { signupError: problem }) : { cancelled: true };
	}
};
