import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ROLES, type Role } from '$lib/roles';
import { RAID_HELPER, roleOfRaidHelperSpec } from '$lib/game/forever';
import { db, schema } from './db';
import type { Character } from './db/schema';
import type { RaidHelperEvent } from './raidhelper';

export interface SignupView {
	id: number;
	name: string;
	position: number;
	note: string | null;
	// Catégorie Raid-Helper brute (Tank, Late, Absence…) et spé brute.
	category: string;
	rhSpec: string | null;
	role: Role | null;
	class: string | null;
	spec: string | null;
	player: { id: string; displayName: string } | null;
	// Perso du site correspondant à la classe de l'inscription (main en priorité).
	character: Pick<Character, 'id' | 'name' | 'surname' | 'isMain' | 'level'> | null;
	// Autres rôles que le joueur peut tenir : spé secondaire ou autre perso.
	otherRoles: { role: Role; via: string }[];
}

/** Croise les inscrits d'une sortie Raid-Helper avec les joueurs et persos du site. */
export function buildComposition(event: RaidHelperEvent) {
	const rh = RAID_HELPER;
	const userIds = [...new Set(event.signUps.map((s) => s.userId))];

	const players = userIds.length
		? db().select().from(schema.users).where(inArray(schema.users.discordId, userIds)).all()
		: [];
	const chars = userIds.length
		? db().select().from(schema.characters).where(inArray(schema.characters.userId, userIds)).all()
		: [];
	const charsByUser = Map.groupBy(chars, (c) => c.userId);

	const views: SignupView[] = event.signUps.map((s) => {
		const role = rh.roles[s.className] ?? null;
		const mapped = s.specName ? rh.specs[s.specName] : undefined;
		const player = players.find((p) => p.discordId === s.userId);
		const own = charsByUser.get(s.userId) ?? [];

		const candidates = own.filter((c) => c.class === mapped?.class);
		const score = (c: Character) => (c.spec === mapped?.spec ? 2 : 0) + (c.role === role ? 1 : 0) + (c.isMain ? 0.5 : 0);
		const character = candidates.sort((a, b) => score(b) - score(a))[0] ?? null;

		const otherRoles: SignupView['otherRoles'] = [];
		const add = (r: Role | null, via: string) => {
			if (r && r !== role && !otherRoles.some((o) => o.role === r)) otherRoles.push({ role: r, via });
		};
		if (character) add(character.role2, 'spé secondaire');
		for (const c of own) {
			if (c.id === character?.id) continue;
			add(c.role, c.name);
			add(c.role2, `${c.name}, spé secondaire`);
		}

		return {
			id: s.id,
			name: s.name,
			position: s.position,
			note: s.note || null,
			category: s.className,
			rhSpec: s.specName ?? null,
			role,
			class: mapped?.class ?? null,
			spec: mapped?.spec ?? null,
			player: player ? { id: player.discordId, displayName: player.displayName } : null,
			character: character && {
				id: character.id,
				name: character.name,
				surname: character.surname,
				isMain: character.isMain,
				level: character.level
			},
			otherRoles
		};
	});
	views.sort((a, b) => a.position - b.position);

	const byRole = Object.fromEntries(ROLES.map((r) => [r, views.filter((v) => v.role === r)])) as Record<Role, SignupView[]>;
	const present = views.filter((v) => v.role);

	// Inscrits d'un autre rôle qui pourraient basculer sur celui-ci.
	const backups = Object.fromEntries(
		ROLES.map((r) => [r, present.filter((v) => v.otherRoles.some((o) => o.role === r))])
	) as Record<Role, SignupView[]>;

	const byClass: Record<string, number> = {};
	for (const v of present) if (v.class) byClass[v.class] = (byClass[v.class] ?? 0) + 1;

	// Banc : inscrits disponibles si besoin (groupe complet ou choix du joueur), rangés par
	// le rôle de leur spé ; ceux sans spé restent dans les statuts.
	const benched = views.filter((v) => v.category === 'Bench');
	const bench = Object.fromEntries(ROLES.map((r) => [r, benched.filter((v) => roleOfRaidHelperSpec(v.rhSpec) === r)])) as Record<Role, SignupView[]>;
	const benchedWithRole = new Set(ROLES.flatMap((r) => bench[r]));

	const statuses = Object.entries(rh.statuses)
		.map(([key, label]) => ({ key, label, signups: views.filter((v) => v.category === key && !benchedWithRole.has(v)) }))
		.filter((g) => g.signups.length);
	const unknown = views.filter((v) => !v.role && !(v.category in rh.statuses));

	return {
		byRole,
		bench,
		benchCount: benched.length,
		backups,
		byClass,
		statuses,
		unknown,
		presentCount: present.length,
		withoutAccount: present.filter((v) => !v.player).length,
		withoutCharacter: present.filter((v) => v.player && !v.character).length
	};
}

export type Composition = ReturnType<typeof buildComposition>;

/**
 * Compare les inscrits d'une sortie avec un roster : qui de l'équipe est inscrit (et avec
 * quel perso), qui manque, qui est inscrit sans en faire partie, et la composition par rôle.
 */
export function compareWithRoster(event: RaidHelperEvent, composition: Composition, rosterId: number) {
	const rh = RAID_HELPER;
	const members = db()
		.select({
			id: schema.characters.id,
			name: schema.characters.name,
			class: schema.characters.class,
			role: schema.characters.role,
			userId: schema.characters.userId,
			player: schema.users.displayName
		})
		.from(schema.rosterMembers)
		.innerJoin(schema.characters, eq(schema.characters.id, schema.rosterMembers.characterId))
		.innerJoin(schema.users, eq(schema.users.discordId, schema.characters.userId))
		.where(and(eq(schema.rosterMembers.rosterId, rosterId), isNull(schema.users.leftAt)))
		.all();

	const present = ROLES.flatMap((r) => composition.byRole[r]);
	const signupOf = (userId: string) => event.signUps.find((s) => s.userId === userId);
	const viewOf = (userId: string) => present.find((v) => v.player?.id === userId);

	const registered = [];
	const missing = [];
	for (const m of members) {
		const view = viewOf(m.userId);
		if (view) {
			registered.push({ ...m, signup: { name: view.name, role: view.role, class: view.class, spec: view.spec }, otherCharacter: view.class !== m.class });
		} else {
			// Inscrit avec un statut (retard, absence…) ou pas inscrit du tout.
			const signup = signupOf(m.userId);
			missing.push({ ...m, status: signup ? (rh.statuses[signup.className] ?? signup.className) : null });
		}
	}

	const rosterUsers = new Set(members.map((m) => m.userId));
	const outsiders = present.filter((v) => !v.player || !rosterUsers.has(v.player.id));

	const zero = () => Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
	const target = zero();
	const signed = zero();
	for (const m of members) target[m.role]++;
	for (const r of registered) if (r.signup.role) signed[r.signup.role]++;

	return { registered, missing, outsiders, target, signed };
}
