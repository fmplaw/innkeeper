import { count, eq } from 'drizzle-orm';
import { ROLES, type Role } from '$lib/roles';
import { db, schema } from './db';
import { permissionFor } from './permissions';

/** Chiffres anonymes de la guilde pour l'accueil public : aucun nom, seulement des comptes. */
export function publicStats() {
	const players = db()
		.select({ roles: schema.users.roles })
		.from(schema.users)
		.all()
		.filter((u) => permissionFor(u.roles)).length;
	const characters = db().select({ n: count() }).from(schema.characters).get()?.n ?? 0;
	// Répartition sur les mains : un joueur compte une fois.
	const mains = db()
		.select({ class: schema.characters.class, role: schema.characters.role })
		.from(schema.characters)
		.where(eq(schema.characters.isMain, true))
		.all();

	const byRole = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
	const byClass: Record<string, number> = {};
	for (const m of mains) {
		byRole[m.role]++;
		byClass[m.class] = (byClass[m.class] ?? 0) + 1;
	}
	return { players, characters, mains: mains.length, byRole, byClass };
}
