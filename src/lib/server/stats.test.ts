import { describe, expect, it } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { db, schema } from './db';
import { updateRole, recordSeenRoles } from './permissions';
import { getGuild, setAccess, setGuild } from './settings';
import { officerStats } from './stats';

const MEMBRE = '900000000000000004';
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

horde();
setGuild({ ...getGuild()!, recruitment: { open: true, classes: ['priest'], roles: ['healer'], text: '' } });
setAccess({ mode: 'mapped-roles' });
recordSeenRoles([MEMBRE]);
updateRole(MEMBRE, { label: 'Membre', permission: 'member' });

createUser('actif', [MEMBRE], { lastLogin: daysAgo(1) });
createUser('mois', [MEMBRE], { lastLogin: daysAgo(12) });
createUser('absent', [MEMBRE], { lastLogin: daysAgo(45) });
// Parti de la guilde : ses persos ne comptent plus.
createUser('parti', [], { lastLogin: daysAgo(2) });

const add = (values: Partial<typeof schema.characters.$inferInsert> & { userId: string; name: string; class: string; role: 'tank' | 'healer' | 'melee' | 'ranged' }) =>
	db().insert(schema.characters).values({ race: 'orc', surname: 'Nom', level: 1, ...values }).run();

add({ userId: 'actif', name: 'Thrall', class: 'shaman', spec: 'restoration', role: 'healer', role2: 'ranged', isMain: true, level: 60, pve: 'competitive', professions: [{ id: 'alchemy', level: 280 }, { id: 'herbalism', level: 300 }] });
add({ userId: 'actif', name: 'Rexxar', class: 'hunter', role: 'ranged', level: 30, professions: [{ id: 'alchemy', level: 120 }] });
add({ userId: 'mois', name: 'Garrosh', class: 'warrior', spec: 'protection', role: 'tank', isMain: true, level: 45, pvp: 'casual', professions: [{ id: 'mining', level: null }] });
add({ userId: 'absent', name: 'Sansnom', class: 'warrior', role: 'melee', isMain: true, surname: null });
add({ userId: 'parti', name: 'Ancien', class: 'mage', role: 'ranged', isMain: true, level: 60, professions: [{ id: 'tailoring', level: 300 }] });

describe('statistiques des officiers', () => {
	const s = officerStats();

	it('ne compte que les membres qui ont encore accès', () => {
		expect(s.totals).toEqual({ members: 3, withCharacters: 3, characters: 4, mains: 3, maxLevel: 1 });
		expect(s.classes.find((c) => c.id === 'mage')?.mains).toBe(0);
		expect(s.professions.find((p) => p.id === 'tailoring')?.count).toBe(0);
	});

	it('compose par classe et par rôle, avec la faction et le recrutement', () => {
		// Classes jouables par la Horde : le paladin y est (mort-vivant).
		expect(s.classes.map((c) => c.id)).toContain('paladin');
		const warrior = s.classes.find((c) => c.id === 'warrior')!;
		expect(warrior).toMatchObject({ mains: 2, rerolls: 0, byRole: { tank: 1, melee: 1, healer: 0, ranged: 0 } });
		expect(s.classes.find((c) => c.id === 'hunter')).toMatchObject({ mains: 0, rerolls: 1 });
		expect(s.classes.find((c) => c.id === 'priest')?.wanted).toBe(true);

		const ranged = s.roles.find((r) => r.role === 'ranged')!;
		expect(ranged).toMatchObject({ mains: 0, offspec: 1, rerolls: 1 });
		expect(s.roles.find((r) => r.role === 'healer')).toMatchObject({ mains: 1, wanted: true });
	});

	it('classe les artisans par niveau, rerolls compris', () => {
		const alchemy = s.professions.find((p) => p.id === 'alchemy')!;
		expect(alchemy).toMatchObject({ count: 2, best: 280 });
		expect(alchemy.top.map((h) => h.name)).toEqual(['Thrall', 'Rexxar']);
		expect(s.professions.find((p) => p.id === 'mining')).toMatchObject({ count: 1, best: null });
	});

	it('répartit les niveaux et les intérêts des mains', () => {
		expect(s.levels.map((l) => l.mains)).toEqual([1, 0, 1, 1]);
		expect(s.interests).toEqual([
			{ axis: 'pve', competitive: 1, casual: 0, none: 2 },
			{ axis: 'pvp', competitive: 0, casual: 1, none: 2 }
		]);
	});

	it('mesure l’activité et liste les fiches à compléter', () => {
		expect(s.activity).toMatchObject({ week: 1, month: 1, older: 1, seenInGame: null });
		expect(s.activity.inactive.map((u) => u.id)).toEqual(['absent']);
		expect(s.incomplete).toEqual([
			{ id: 'absent', displayName: 'Joueur absent', missing: ['nom de famille', 'spé du main', 'métiers du main', 'intérêts du main'] }
		]);
	});
});
