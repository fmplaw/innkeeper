import { error, fail } from '@sveltejs/kit';
import { and, asc, desc, eq, inArray, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { audit } from '$lib/server/audit';
import { characterTarget, getCharacter } from '$lib/server/characters';
import { db, schema } from '$lib/server/db';
import { requireOfficer, requireViewer } from '$lib/server/guards';
import {
	addToRoster,
	getRoster,
	isOfficer,
	listRosters,
	removeFromRoster,
	rosterCharacterIds
} from '$lib/server/rosters';
import { ROLES, type Role } from '$lib/roles';
import { FACTIONS, PROFESSIONS, RACES, type Faction } from '$lib/game/forever';
import { INTEREST_LEVELS, type InterestLevel } from '$lib/interests';
import type { Actions, PageServerLoad } from './$types';

const { characters, users } = schema;
const main = alias(characters, 'main');

export const load: PageServerLoad = ({ locals, url }) => {
	requireViewer(locals);
	const officer = isOfficer(locals);

	const filters = {
		// Roster affiché : vide = toute la guilde.
		equipe: url.searchParams.get('equipe') ?? '',
		classe: url.searchParams.get('classe') ?? '',
		role: url.searchParams.get('role') ?? '',
		// « Toute la guilde » montre les mains par défaut ; un roster composé montre tout
		// (les officiers peuvent y avoir mis des rerolls).
		type: url.searchParams.get('type') ?? (url.searchParams.get('equipe') ? 'tous' : 'main'),
		faction: url.searchParams.get('faction') ?? '',
		// Le filtre de rôle inclut aussi les spés secondaires.
		secondaire: url.searchParams.get('secondaire') === '1',
		pve: url.searchParams.get('pve') ?? '',
		pvp: url.searchParams.get('pvp') ?? '',
		metier: url.searchParams.get('metier') ?? '',
		niveau: url.searchParams.get('niveau') ?? ''
	};

	const rosters = listRosters(officer);
	const roster = filters.equipe ? getRoster(Number(filters.equipe), officer) : undefined;
	if (filters.equipe && !roster) error(404, 'Roster introuvable');
	const memberIds = roster ? rosterCharacterIds(roster.id) : [];

	const where: SQL[] = [];
	if (roster) where.push(inArray(characters.id, memberIds));
	if (filters.classe) where.push(eq(characters.class, filters.classe));
	if (ROLES.includes(filters.role as Role)) {
		const role = filters.role as Role;
		where.push(filters.secondaire ? or(eq(characters.role, role), eq(characters.role2, role))! : eq(characters.role, role));
	}
	if (FACTIONS.includes(filters.faction as Faction))
		where.push(inArray(characters.race, RACES.filter((r) => r.faction === filters.faction).map((r) => r.id)));
	if (filters.type === 'main') where.push(eq(characters.isMain, true));
	if (filters.type === 'reroll') where.push(eq(characters.isMain, false));
	if (INTEREST_LEVELS.includes(filters.pve as InterestLevel)) where.push(eq(characters.pve, filters.pve as InterestLevel));
	if (INTEREST_LEVELS.includes(filters.pvp as InterestLevel)) where.push(eq(characters.pvp, filters.pvp as InterestLevel));

	const columns = {
		id: characters.id,
		name: characters.name,
		surname: characters.surname,
		race: characters.race,
		class: characters.class,
		spec: characters.spec,
		role: characters.role,
		spec2: characters.spec2,
		role2: characters.role2,
		isMain: characters.isMain,
		level: characters.level,
		professions: characters.professions,
		recipes: characters.recipes,
		pve: characters.pve,
		pvp: characters.pvp,
		player: users.displayName,
		playerId: users.discordId,
		mainName: main.name,
		gameSyncedAt: characters.gameSyncedAt,
		createdAt: characters.createdAt
	};
	let rows = db()
		.select(columns)
		.from(characters)
		.innerJoin(users, eq(users.discordId, characters.userId))
		.leftJoin(main, and(eq(main.userId, characters.userId), eq(main.isMain, true)))
		.where(and(...where))
		.orderBy(asc(characters.class), desc(characters.isMain), asc(characters.name))
		.all();

	// Métier (et niveau minimum) : filtré ici, les métiers étant stockés en JSON.
	if (PROFESSIONS.some((p) => p.id === filters.metier)) {
		const min = Number(filters.niveau) || 0;
		rows = rows.filter((r) => r.professions.some((p) => p.id === filters.metier && (p.level ?? 0) >= min));
	}

	const byClass: Record<string, number> = {};
	const zero = () => Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
	const byRole = zero();
	// Persos capables de tenir le rôle en spé secondaire (en plus de leur rôle principal).
	const byRole2 = zero();
	for (const row of rows) {
		byClass[row.class] = (byClass[row.class] ?? 0) + 1;
		byRole[row.role]++;
		if (row.role2 && row.role2 !== row.role) byRole2[row.role2]++;
	}

	// Dans un roster, les officiers ajoutent des persos choisis parmi toute la guilde.
	const candidates =
		roster && officer
			? db()
					.select({ id: characters.id, name: characters.name, class: characters.class, isMain: characters.isMain, player: users.displayName })
					.from(characters)
					.innerJoin(users, eq(users.discordId, characters.userId))
					.orderBy(asc(users.displayName), desc(characters.isMain), asc(characters.name))
					.all()
					.filter((c) => !memberIds.includes(c.id))
			: [];

	return { filters, rosters, roster, officer, rows, byClass, byRole, byRole2, candidates };
};

async function rosterAction(locals: App.Locals, request: Request) {
	requireOfficer(locals);
	const form = await request.formData();
	const roster = getRoster(Number(form.get('rosterId')), true);
	const characterId = Number(form.get('characterId'));
	const character = characterId ? getCharacter(characterId) : undefined;
	if (!roster || !character) return null;
	return { rosterId: roster.id, characterId, rosterName: roster.name, target: characterTarget(character) };
}

export const actions: Actions = {
	add: async ({ locals, request }) => {
		const target = await rosterAction(locals, request);
		if (!target) return fail(400, { error: 'Choisis un perso.' });
		addToRoster(target.rosterId, target.characterId);
		audit(locals, 'roster.add', target.target, { roster: target.rosterName });
	},
	remove: async ({ locals, request }) => {
		const target = await rosterAction(locals, request);
		if (!target) return fail(400);
		removeFromRoster(target.rosterId, target.characterId);
		audit(locals, 'roster.remove', target.target, { roster: target.rosterName });
	}
};
