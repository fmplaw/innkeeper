import { fail } from '@sveltejs/kit';
import { asc, isNull } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { listDepartures, markLeft, markSeen, reinstate, setLeftComment } from '$lib/server/departures';
import { requireOfficer } from '$lib/server/guards';
import { getRecruitment } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	const { demoteFormer, notifyChannelId } = getRecruitment();
	// Joueurs encore membres, pour noter un départ à la main.
	const players = db()
		.select({ id: schema.users.discordId, displayName: schema.users.displayName })
		.from(schema.users)
		.where(isNull(schema.users.leftAt))
		.orderBy(asc(schema.users.displayName))
		.all();
	return { ...listDepartures(), players, demoteFormer, announces: Boolean(notifyChannelId) };
};

const userIdOf = (form: FormData) => String(form.get('userId') ?? '');
const commentOf = (form: FormData) => String(form.get('comment') ?? '').trim().slice(0, 500);
const officerName = (locals: App.Locals) => locals.user?.displayName ?? locals.admin?.username ?? 'un officier';

export const actions: Actions = {
	leave: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const userId = userIdOf(form);
		if (userId === locals.user?.id) return fail(400, { error: 'Tu ne peux pas noter ton propre départ.' });
		const u = await markLeft(userId, locals, { by: officerName(locals), comment: commentOf(form) });
		if (!u) return fail(404, { error: 'Joueur introuvable, ou déjà parti.' });
		return { left: u.displayName };
	},
	comment: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		if (!setLeftComment(userIdOf(form), commentOf(form), locals)) return fail(404);
	},
	seen: async ({ locals, request }) => {
		requireOfficer(locals);
		markSeen(userIdOf(await request.formData()));
	},
	reinstate: async ({ locals, request }) => {
		requireOfficer(locals);
		const u = reinstate(userIdOf(await request.formData()), locals);
		if (!u) return fail(404);
		return { reinstated: u.displayName };
	}
};
