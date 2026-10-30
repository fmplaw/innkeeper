import { describe, expect, it } from 'vitest';
import { createUser } from '../../test/helpers';
import { db, schema } from './db';
import { getPlayer } from './players';
import { setAccess } from './settings';
import { updateRole, recordSeenRoles } from './permissions';

const SANG_NEUF = '900000000000000005';

setAccess({ mode: 'mapped-roles' });
recordSeenRoles([SANG_NEUF]);
updateRole(SANG_NEUF, { label: 'Recrue', permission: 'member' });

createUser('joueur', [SANG_NEUF]);
createUser('candidat', []);
const main = db()
	.insert(schema.characters)
	.values({ userId: 'joueur', name: 'Thrall', race: 'orc', class: 'shaman', role: 'healer', isMain: true, level: 60, notes: 'Absent en août' })
	.returning()
	.get();
db().insert(schema.characters).values({ userId: 'joueur', name: 'Rexxar', race: 'orc', class: 'hunter', role: 'ranged', level: 42 }).run();
const publicRoster = db().insert(schema.rosters).values({ name: 'Raid principal' }).returning().get();
const privateRoster = db().insert(schema.rosters).values({ name: 'En préparation', visibility: 'officers' }).returning().get();
for (const r of [publicRoster, privateRoster]) db().insert(schema.rosterMembers).values({ rosterId: r.id, characterId: main.id }).run();

describe('page joueur', () => {
	it('montre le main puis les rerolls, avec les noms des rôles Discord', () => {
		const player = getPlayer('joueur', false)!;
		expect(player.characters.map((c) => c.name)).toEqual(['Thrall', 'Rexxar']);
		expect(player.roles).toEqual(['Recrue']);
	});

	it('cache aux membres les notes, les rosters réservés aux officiers et le suivi', () => {
		const player = getPlayer('joueur', false)!;
		expect(player.characters[0].notes).toBeNull();
		expect(player.characters[0].rosters.map((r) => r.name)).toEqual(['Raid principal']);
		expect(player.officerInfo).toBeNull();
	});

	it('montre tout aux officiers', () => {
		const player = getPlayer('joueur', true)!;
		expect(player.characters[0].notes).toBe('Absent en août');
		expect(player.characters[0].rosters.map((r) => r.name).sort()).toEqual(['En préparation', 'Raid principal']);
		expect(player.officerInfo?.joinedKnown).toBe(false);
	});

	it('pas de page pour un candidat non accepté ni pour un inconnu', () => {
		expect(getPlayer('candidat', true)).toBeNull();
		expect(getPlayer('inexistant', true)).toBeNull();
	});
});
