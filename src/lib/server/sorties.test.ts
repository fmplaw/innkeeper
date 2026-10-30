import { describe, expect, it } from 'vitest';
import { createUser } from '../../test/helpers';
import { db, schema } from './db';
import type { RaidHelperEvent, RaidHelperSignUp } from './raidhelper';
import { buildComposition, compareWithRoster } from './sorties';

// Événement fictif au format de l'API Raid-Helper v4, modèle « wowforever ».
let position = 0;
const signup = (userId: string, name: string, className: string, specName?: string): RaidHelperSignUp => ({
	id: ++position,
	userId,
	name,
	className,
	specName,
	status: 'primary',
	position,
	entryTime: 0
});
const event: RaidHelperEvent = {
	id: '1',
	serverId: '1',
	title: 'Raid du mercredi',
	startTime: 0,
	signUps: [
		signup('u-shaman', 'Thrall', 'Healer', 'Restoration1'),
		signup('u-paladin', 'Tirion', 'Tank', 'Protection1'),
		signup('u-reroll', 'Rexxar', 'Ranged', 'Marksmanship'),
		signup('u-inconnu', 'Inconnu', 'Melee', 'Fury'),
		signup('u-retard', 'Retard', 'Late')
	]
};

// Joueurs du site : le chaman a aussi un reroll guerrier (mêlée) ; le joueur inscrit en chasseur a un main mage.
createUser('u-shaman');
createUser('u-paladin');
createUser('u-reroll');
createUser('u-retard');
createUser('u-absent');
const c = db().insert(schema.characters);
c.values({ userId: 'u-shaman', name: 'Thrall', race: 'orc', class: 'shaman', spec: 'restoration', role: 'healer', isMain: true, level: 60 }).run();
c.values({ userId: 'u-shaman', name: 'Garrosh', race: 'orc', class: 'warrior', spec: 'fury', role: 'melee', isMain: false, level: 60 }).run();
c.values({ userId: 'u-paladin', name: 'Sylv', race: 'undead', class: 'paladin', spec: 'protection', role: 'tank', role2: 'healer', isMain: true, level: 60 }).run();
c.values({ userId: 'u-reroll', name: 'Jaina', race: 'troll', class: 'mage', role: 'ranged', isMain: true, level: 60 }).run();
c.values({ userId: 'u-retard', name: 'Vol', race: 'troll', class: 'priest', role: 'healer', isMain: true, level: 60 }).run();
c.values({ userId: 'u-absent', name: 'Saurfang', race: 'orc', class: 'warrior', spec: 'protection', role: 'tank', isMain: true, level: 60 }).run();

describe('composition d’une sortie', () => {
	const comp = buildComposition(event);

	it('déduit la classe de la spé Raid-Helper (suffixe 1 = homonyme)', () => {
		expect(comp.byRole.healer[0]).toMatchObject({ class: 'shaman', spec: 'restoration' });
		expect(comp.byRole.tank[0]).toMatchObject({ class: 'paladin', spec: 'protection' });
	});

	it('retrouve le perso du site correspondant à la classe inscrite', () => {
		expect(comp.byRole.healer[0].character?.name).toBe('Thrall');
		// Inscrit en chasseur alors que son seul perso est mage : pas de correspondance.
		expect(comp.byRole.ranged[0].player).not.toBeNull();
		expect(comp.byRole.ranged[0].character).toBeNull();
		expect(comp.withoutCharacter).toBe(1);
	});

	it('repère les inscrits sans compte et les statuts', () => {
		expect(comp.byRole.melee[0].player).toBeNull();
		expect(comp.withoutAccount).toBe(1);
		expect(comp.statuses).toEqual([expect.objectContaining({ key: 'Late', signups: [expect.objectContaining({ name: 'Retard' })] })]);
		expect(comp.presentCount).toBe(4);
	});

	it('propose les rôles de renfort (spé secondaire ou reroll)', () => {
		// Le paladin peut soigner en spé secondaire, le chaman peut jouer mêlée avec son reroll.
		expect(comp.backups.healer.map((v) => v.name)).toEqual(['Tirion']);
		expect(comp.backups.melee.map((v) => v.name)).toEqual(['Thrall']);
	});

	it('compare avec un roster : inscrits, absents, hors roster et couverture par rôle', () => {
		const roster = db().insert(schema.rosters).values({ name: 'Raid principal' }).returning().get();
		const ids = db().select({ id: schema.characters.id, name: schema.characters.name }).from(schema.characters).all();
		for (const name of ['Thrall', 'Saurfang', 'Vol']) {
			db().insert(schema.rosterMembers).values({ rosterId: roster.id, characterId: ids.find((c) => c.name === name)!.id }).run();
		}
		const cmp = compareWithRoster(event, comp, roster.id);
		expect(cmp.registered.map((r) => r.name)).toEqual(['Thrall']);
		expect(cmp.missing).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'Saurfang', status: null }),
				expect.objectContaining({ name: 'Vol', status: 'En retard' })
			])
		);
		expect(cmp.outsiders.map((o) => o.name).sort()).toEqual(['Inconnu', 'Rexxar', 'Tirion']);
		expect(cmp.target).toEqual({ tank: 1, healer: 2, melee: 0, ranged: 0 });
		expect(cmp.signed).toEqual({ tank: 0, healer: 1, melee: 0, ranged: 0 });
	});
});

describe('banc', () => {
	it('range les remplaçants par le rôle de leur spé, hors des présents', async () => {
		const { buildComposition } = await import('./sorties');
		const event = {
			id: '1',
			serverId: '1',
			title: 'MC',
			startTime: 0,
			signUps: [
				{ id: 1, userId: 'a', name: 'Tanky', className: 'Tank', specName: 'Protection', status: 'primary', position: 1, entryTime: 0 },
				{ id: 2, userId: 'b', name: 'Soins', className: 'Bench', specName: 'Restoration1', status: 'primary', position: 2, entryTime: 0 },
				{ id: 3, userId: 'c', name: 'Ours', className: 'Bench', specName: 'Guardian', status: 'primary', position: 3, entryTime: 0 },
				{ id: 4, userId: 'd', name: 'SansSpe', className: 'Bench', status: 'primary', position: 4, entryTime: 0 }
			]
		};
		const comp = buildComposition(event);
		expect(comp.presentCount).toBe(1);
		expect(comp.bench.healer.map((s) => s.name)).toEqual(['Soins']);
		expect(comp.bench.tank.map((s) => s.name)).toEqual(['Ours']);
		expect(comp.benchCount).toBe(3);
		// Sans spé, le remplaçant reste visible dans les statuts.
		expect(comp.statuses.find((g) => g.key === 'Bench')?.signups.map((s) => s.name)).toEqual(['SansSpe']);
	});
});
