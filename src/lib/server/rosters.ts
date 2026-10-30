import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from './db';

const { rosters, rosterMembers } = schema;

export const rosterSchema = z.object({
	name: z.string().trim().min(2, 'Nom trop court').max(60),
	description: z
		.string()
		.trim()
		.max(300)
		.transform((v) => v || null),
	visibility: z.enum(['members', 'officers'])
});

/** Officier Discord ou admin local : voit tous les rosters et les compose. */
export const isOfficer = (locals: App.Locals) => Boolean(locals.admin || locals.user?.permission === 'officer');

export function listRosters(officer: boolean) {
	return db()
		.select()
		.from(rosters)
		.where(officer ? undefined : eq(rosters.visibility, 'members'))
		.orderBy(asc(rosters.name))
		.all();
}

export function getRoster(id: number, officer: boolean) {
	const roster = db().select().from(rosters).where(eq(rosters.id, id)).get();
	return roster && (officer || roster.visibility === 'members') ? roster : undefined;
}

export const createRoster = (values: z.output<typeof rosterSchema>) => db().insert(rosters).values(values).run();

export const updateRoster = (id: number, values: z.output<typeof rosterSchema>) =>
	db().update(rosters).set(values).where(eq(rosters.id, id)).run();

export const deleteRoster = (id: number) => db().delete(rosters).where(eq(rosters.id, id)).run();

export function rosterCharacterIds(rosterId: number) {
	return db()
		.select({ id: rosterMembers.characterId })
		.from(rosterMembers)
		.where(eq(rosterMembers.rosterId, rosterId))
		.all()
		.map((r) => r.id);
}

export const addToRoster = (rosterId: number, characterId: number) =>
	db().insert(rosterMembers).values({ rosterId, characterId }).onConflictDoNothing().run();

export const removeFromRoster = (rosterId: number, characterId: number) =>
	db()
		.delete(rosterMembers)
		.where(and(eq(rosterMembers.rosterId, rosterId), eq(rosterMembers.characterId, characterId)))
		.run();
