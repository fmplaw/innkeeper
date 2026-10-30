import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { asAdmin, asMember, createUser, formData, horde, shaman } from '../../test/helpers';
import {
	canEdit,
	createCharacter,
	deleteCharacter,
	getMain,
	listCharacters,
	parseCharacterForm,
	setMain,
	updateCharacter,
	type CharacterInput
} from './characters';
import { db, schema } from './db';

const parse = (values: Record<string, string | string[]>) => parseCharacterForm(formData(values));
const valid = (values: Record<string, string | string[]> = {}) => {
	const parsed = parse(shaman(values));
	if (!parsed.data) throw new Error(`Perso invalide : ${JSON.stringify(parsed.errors)}`);
	return parsed.data;
};

beforeAll(() => horde());

describe('validation d’un perso', () => {
	it('exige un nom de famille, obligatoire dans Forever', () => {
		expect(parse(shaman({ surname: '' })).errors?.surname).toMatch(/Nom de famille requis/);
		expect(valid().surname).toBe('Fils-de-durotan');
	});

	it('met les noms en forme : une majuscule, le reste en minuscules', () => {
		const data = valid({ name: '  tHRALL ', surname: 'FILS-DE-DUROTAN' });
		expect([data.name, data.surname]).toEqual(['Thrall', 'Fils-de-durotan']);
		expect(valid({ name: 'éLISE' }).name).toBe('Élise');
	});

	it('un métier coché sans niveau vaut 1', () => {
		expect(valid({ professions: ['mining'] }).professions).toEqual([{ id: 'mining', level: 1 }]);
	});

	it('accepte un perso complet', () => {
		const data = valid({ pve: 'competitive', professions: ['alchemy', 'herbalism', 'cooking'], 'level-alchemy': '275' });
		expect(data.professions).toEqual([
			{ id: 'alchemy', level: 275 },
			{ id: 'herbalism', level: 1 },
			{ id: 'cooking', level: 1 }
		]);
		expect(data.pve).toBe('competitive');
		expect(data.pvp).toBeNull();
	});

	it('exige une race de la faction de la guilde', () => {
		expect(parse(shaman({ race: 'human', class: 'warrior', spec: 'arms', role: 'melee' })).errors?.race).toBeDefined();
		expect(parse(shaman({ race: '' })).errors?.race).toBeDefined();
	});

	it('refuse une classe non jouable avec la race', () => {
		const result = parse(shaman({ race: 'tauren', class: 'mage', spec: 'frost', role: 'ranged' }));
		expect(result.errors?.class).toMatch(/Tauren/);
	});

	it('refuse un rôle incompatible avec la spé', () => {
		expect(parse(shaman({ role: 'tank' })).errors?.role).toMatch(/Restauration/);
	});

	it('n’ouvre la double spé qu’à partir du niveau 40', () => {
		expect(parse(shaman({ level: '30', spec2: 'elemental', role2: 'ranged' })).errors?.spec2).toMatch(/40/);
		expect(parse(shaman({ level: '40', spec2: 'elemental', role2: 'ranged' })).data).toBeDefined();
		expect(parse(shaman({ spec2: 'elemental' })).errors?.role2).toBe('Rôle requis');
	});

	it('limite à 2 métiers principaux et au niveau 300', () => {
		expect(parse(shaman({ professions: ['alchemy', 'herbalism', 'mining'] })).errors?.professions).toMatch(/2 métiers/);
		expect(parse(shaman({ professions: ['alchemy', 'herbalism', 'cooking', 'fishing'] })).data).toBeDefined();
		expect(parse(shaman({ professions: ['alchemy'], 'level-alchemy': '350' })).errors?.professions).toMatch(/300/);
	});
});

describe('main et rerolls', () => {
	const add = (userId: string, name: string, isMain = false): ReturnType<typeof createCharacter> =>
		createCharacter(userId, { ...valid({ name }), isMain } as CharacterInput);

	it('le premier perso devient le main, les suivants sont des rerolls', () => {
		createUser('m1');
		const first = add('m1', 'Thrall');
		const second = add('m1', 'Rehgar');
		expect(first.isMain).toBe(true);
		expect(second.isMain).toBe(false);
		expect(getMain('m1')?.id).toBe(first.id);
	});

	it('promouvoir un reroll rétrograde l’ancien main', () => {
		const [main, reroll] = listCharacters('m1');
		setMain(reroll);
		expect(getMain('m1')?.id).toBe(reroll.id);
		expect(listCharacters('m1').find((c) => c.id === main.id)?.isMain).toBe(false);
	});

	it('on ne retire pas le statut de main en modifiant la fiche', () => {
		const main = getMain('m1')!;
		updateCharacter(main, { ...valid({ name: main.name }), isMain: false } as CharacterInput);
		expect(getMain('m1')?.id).toBe(main.id);
	});

	it('refuse de supprimer un main qui a encore des rerolls', () => {
		const main = getMain('m1')!;
		expect(deleteCharacter(main)).toMatch(/désigne d’abord un autre main/);
		const reroll = listCharacters('m1').find((c) => !c.isMain)!;
		expect(deleteCharacter(reroll)).toBeNull();
		expect(deleteCharacter(main)).toBeNull();
		expect(listCharacters('m1')).toHaveLength(0);
	});

	it('la base interdit deux mains pour un même joueur', () => {
		createUser('m2');
		add('m2', 'Garrosh');
		const rehgar = add('m2', 'Rehgar');
		expect(() =>
			db().update(schema.characters).set({ isMain: true }).where(eq(schema.characters.id, rehgar.id)).run()
		).toThrow(/UNIQUE/);
	});

	it('n’enregistre la date des intérêts que s’ils changent', () => {
		createUser('m3');
		const c = createCharacter('m3', { ...valid({ name: 'Vol' }), isMain: false } as CharacterInput);
		expect(c.interestsUpdatedAt).toBeNull();
		updateCharacter(c, { ...valid({ name: 'Vol', pve: 'casual' }), isMain: false } as CharacterInput);
		const first = listCharacters('m3')[0].interestsUpdatedAt;
		expect(first).toBeInstanceOf(Date);
		db().update(schema.characters).set({ interestsUpdatedAt: new Date(1000) }).run();
		updateCharacter(listCharacters('m3')[0], { ...valid({ name: 'Vol2', pve: 'casual' }), isMain: false } as CharacterInput);
		expect(listCharacters('m3')[0].interestsUpdatedAt?.getTime()).toBe(1000);
	});
});

describe('droits de modification', () => {
	it('un joueur ne modifie que ses persos ; officiers et admin modifient tout', () => {
		createUser('d1');
		const c = createCharacter('d1', { ...valid({ name: 'Cairne' }), isMain: false } as CharacterInput);
		expect(canEdit(asMember('d1'), c)).toBe(true);
		expect(canEdit(asMember('autre'), c)).toBe(false);
		expect(canEdit(asMember('autre', 'officer'), c)).toBe(true);
		expect(canEdit(asAdmin(), c)).toBe(true);
	});
});
