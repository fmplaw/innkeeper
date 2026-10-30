import { fail } from '@sveltejs/kit';
import { count } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { requireOfficer } from '$lib/server/guards';
import { audit, diff } from '$lib/server/audit';
import { createRoster, deleteRoster, getRoster, listRosters, rosterSchema, updateRoster } from '$lib/server/rosters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	const sizes = new Map(
		db()
			.select({ id: schema.rosterMembers.rosterId, n: count() })
			.from(schema.rosterMembers)
			.groupBy(schema.rosterMembers.rosterId)
			.all()
			.map((r) => [r.id, r.n])
	);
	return { rosters: listRosters(true).map((r) => ({ ...r, size: sizes.get(r.id) ?? 0 })) };
};

function parse(form: FormData) {
	return rosterSchema.safeParse({
		name: form.get('name') ?? '',
		description: form.get('description') ?? '',
		visibility: form.get('visibility')
	});
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireOfficer(locals);
		const parsed = parse(await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const id = Number(createRoster(parsed.data).lastInsertRowid);
		audit(locals, 'roster.create', { label: parsed.data.name, url: `/roster?equipe=${id}` }, { visibilite: parsed.data.visibility });
		return { created: true };
	},
	update: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const parsed = parse(form);
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const id = Number(form.get('id'));
		const before = getRoster(id, true);
		updateRoster(id, parsed.data);
		audit(locals, 'roster.update', { label: parsed.data.name, url: `/roster?equipe=${id}` }, diff(before, parsed.data, ['name', 'description', 'visibility']));
		return { saved: true };
	},
	delete: async ({ locals, request }) => {
		requireOfficer(locals);
		const id = Number((await request.formData()).get('id'));
		const roster = getRoster(id, true);
		deleteRoster(id);
		if (roster) audit(locals, 'roster.delete', { label: roster.name });
		return { deleted: true };
	}
};
