import { and, desc, eq, gte, inArray, lt, type SQL } from 'drizzle-orm';
import { AUDIT_ACTIONS, AUDIT_GROUPS } from '$lib/audit';
import { db, schema } from '$lib/server/db';
import { requireLocalAdmin } from '$lib/server/guards';
import { getGuild } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

const { auditLog } = schema;
const PAGE_SIZE = 100;

// Journal d'audit : réservé à l'admin de l'instance (requêtes, litiges entre officiers).
export const load: PageServerLoad = ({ locals, url }) => {
	requireLocalAdmin(locals);

	const filters = {
		qui: url.searchParams.get('qui') ?? '',
		quoi: url.searchParams.get('quoi') ?? '',
		du: url.searchParams.get('du') ?? '',
		au: url.searchParams.get('au') ?? ''
	};
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

	const where: SQL[] = [];
	if (filters.qui) where.push(eq(auditLog.actorName, filters.qui));
	if (AUDIT_GROUPS.includes(filters.quoi as never)) {
		const actions = Object.entries(AUDIT_ACTIONS)
			.filter(([, a]) => a.group === filters.quoi)
			.map(([key]) => key);
		where.push(inArray(auditLog.action, actions));
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(filters.du)) where.push(gte(auditLog.at, new Date(`${filters.du}T00:00:00`)));
	if (/^\d{4}-\d{2}-\d{2}$/.test(filters.au)) where.push(lt(auditLog.at, new Date(new Date(`${filters.au}T00:00:00`).getTime() + 86_400_000)));

	const rows = db()
		.select()
		.from(auditLog)
		.where(and(...where))
		.orderBy(desc(auditLog.at), desc(auditLog.id))
		.limit(PAGE_SIZE + 1)
		.offset((page - 1) * PAGE_SIZE)
		.all();

	const actors = db()
		.selectDistinct({ name: auditLog.actorName })
		.from(auditLog)
		.orderBy(auditLog.actorName)
		.all()
		.map((r) => r.name);

	const format = new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'short',
		timeStyle: 'medium',
		timeZone: getGuild()?.timezone ?? 'Europe/Paris'
	});

	return {
		filters,
		page,
		hasMore: rows.length > PAGE_SIZE,
		actors,
		groups: AUDIT_GROUPS,
		entries: rows.slice(0, PAGE_SIZE).map((r) => ({ ...r, when: format.format(r.at) }))
	};
};
