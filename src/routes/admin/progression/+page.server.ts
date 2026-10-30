import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { audit } from '$lib/server/audit';
import { db, schema } from '$lib/server/db';
import { requireOfficer } from '$lib/server/guards';
import { listRoles } from '$lib/server/permissions';
import { listNewcomers, markReviewed, setJoinedAt } from '$lib/server/progression';
import { getRecruitment } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireOfficer(locals);
	const { arrivalRoleId, reviewDays } = getRecruitment();
	const role = listRoles().find((r) => r.id === arrivalRoleId);
	return {
		arrivalRole: arrivalRoleId ? (role?.name ?? role?.label ?? arrivalRoleId) : null,
		reviewDays,
		newcomers: await listNewcomers()
	};
};

function memberTarget(userId: string) {
	const user = db().select({ name: schema.users.displayName }).from(schema.users).where(eq(schema.users.discordId, userId)).get();
	return user ? { label: user.name, url: '/admin/progression' } : null;
}

export const actions: Actions = {
	review: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const target = memberTarget(userId);
		if (!target) return fail(404);
		const note = String(form.get('note') ?? '').trim().slice(0, 300) || null;
		markReviewed(userId, note);
		audit(locals, 'member.review', target, { note: note ?? undefined });
	},
	joined: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const raw = String(form.get('date') ?? '');
		const target = memberTarget(userId);
		if (!target || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fail(400, { error: 'Date invalide.' });
		const date = new Date(`${raw}T12:00:00`);
		if (date.getTime() > Date.now()) return fail(400, { error: 'La date d’arrivée ne peut pas être dans le futur.' });
		setJoinedAt(userId, date);
		audit(locals, 'member.joined', target, { date: raw });
	}
};
