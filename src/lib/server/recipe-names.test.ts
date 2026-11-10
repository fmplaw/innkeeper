import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { createCharacter } from './characters';
import { db, schema } from './db';
import { applyImport, planImport } from './game-import';
import { fetchWowheadName, fetchWowheadSpell, translateInBackground, translateRecipes } from './recipe-names';

horde();

const sheet = (userId: string, name: string) =>
	createCharacter(userId, {
		name,
		surname: '',
		race: 'troll',
		class: 'mage',
		spec: 'frost',
		role: 'ranged',
		spec2: null,
		role2: null,
		level: 20,
		professions: [{ id: 'enchanting', level: 4 }],
		recipes: null,
		pve: null,
		pvp: null,
		notes: null,
		isMain: true
	});

const exportOf = (name: string, locale: string, recipes: { id: number; name: string }[]) => ({
	format: 1,
	exportedAt: 1_800_000_000,
	locale,
	player: { name, level: 20 },
	recipes: {
		skill333: { skillLine: 333, name: 'Enchanting', skill: 4, list: recipes }
	}
});

const known = (id: number) => db().select().from(schema.characters).where(eq(schema.characters.id, id)).get()!.knownRecipes;

/** Faux Wowhead : répond pour les numéros connus, 404 sinon ; compte les appels. */
function fakeWowhead(names: Record<number, string>, icons: Record<number, string> = {}) {
	const calls: number[] = [];
	const fetchFn = (async (url: string) => {
		const id = Number(String(url).match(/spell\/(\d+)/)![1]);
		calls.push(id);
		return names[id] ? new Response(JSON.stringify({ name: names[id], icon: icons[id] })) : new Response('{}', { status: 404 });
	}) as typeof fetch;
	return { fetchFn, calls };
}

describe('noms français des recettes', () => {
	it("un export en anglais est traduit avec les noms appris d'un export en français", () => {
		createUser('fr');
		createUser('en');
		sheet('fr', 'Vinshal');
		const dayce = sheet('en', 'Dayce');
		applyImport(planImport(exportOf('Vinshal', 'frFR', [{ id: 7457, name: 'Ench. de bracelets (Endurance mineure)' }])));
		applyImport(
			planImport(
				exportOf('Dayce', 'enUS', [
					{ id: 7457, name: 'Enchant Bracer - Minor Stamina' },
					{ id: 7421, name: 'Runed Copper Rod' }
				])
			)
		);
		expect(known(dayce.id)![0].recipes).toEqual([
			{ id: 7457, name: 'Ench. de bracelets (Endurance mineure)' },
			{ id: 7421, name: 'Runed Copper Rod' }
		]);
		// Un export en anglais n'apprend rien au dictionnaire.
		expect(
			translateRecipes([
				{
					profession: 'enchanting',
					skill: 4,
					recipes: [{ id: 7421, name: 'x' }]
				}
			])[0].recipes[0].name
		).toBe('x');
	});

	it('demande à Wowhead les noms manquants, une seule fois, et retraduit les fiches', async () => {
		createUser('en2');
		const ayla = sheet('en2', 'Ayla');
		applyImport(
			planImport(
				exportOf('Ayla', 'enUS', [
					{ id: 7430, name: 'Runed Copper Rod' },
					{ id: 99999, name: 'Unknown Thing' }
				])
			)
		);
		const wowhead = fakeWowhead({ 7430: 'Bâtonnet runique en cuivre' });
		expect(await translateInBackground(wowhead.fetchFn)).toBe(1);
		expect(known(ayla.id)![0].recipes.map((r) => r.name)).toEqual(['Bâtonnet runique en cuivre', 'Unknown Thing']);
		expect(wowhead.calls).toEqual(expect.arrayContaining([7430, 99999]));
		const asked = wowhead.calls.length;

		// Deuxième passage : rien à redemander (ni le connu, ni l'inconnu).
		expect(await translateInBackground(wowhead.fetchFn)).toBe(0);
		expect(wowhead.calls).toHaveLength(asked);

		// Un nouvel export en anglais est traduit tout de suite, sans Wowhead.
		applyImport(
			planImport({
				...exportOf('Ayla', 'enUS', [{ id: 7430, name: 'Runed Copper Rod' }]),
				exportedAt: 1_800_000_100
			})
		);
		expect(known(ayla.id)![0].recipes).toEqual([{ id: 7430, name: 'Bâtonnet runique en cuivre' }]);
	});

	it('Wowhead injoignable ou réponse bizarre : null', async () => {
		const down = (async () => {
			throw new Error('réseau');
		}) as unknown as typeof fetch;
		expect(await fetchWowheadName(1, down)).toBeNull();
		const odd = (async () => new Response(JSON.stringify({ name: 42 }))) as unknown as typeof fetch;
		expect(await fetchWowheadName(1, odd)).toBeNull();
	});

	it("ajoute l'icône de Wowhead, sans toucher au nom appris d'un export en français", async () => {
		createUser('ic');
		const brena = sheet('ic', 'Brena');
		applyImport(planImport(exportOf('Brena', 'frFR', [{ id: 3170, name: 'Élixir de sang de troll mineur' }])));
		const wowhead = fakeWowhead({ 3170: 'Élixir de sang de Troll mineur' }, { 3170: 'INV_Potion_78' });
		await translateInBackground(wowhead.fetchFn);
		expect(known(brena.id)![0].recipes).toEqual([{ id: 3170, name: 'Élixir de sang de troll mineur', icon: 'inv_potion_78' }]);
		expect(wowhead.calls).toContain(3170);

		// Déjà connue : plus redemandée, et un nouvel export la garde.
		const asked = wowhead.calls.length;
		await translateInBackground(wowhead.fetchFn);
		expect(wowhead.calls).toHaveLength(asked);
		applyImport(planImport({ ...exportOf('Brena', 'frFR', [{ id: 3170, name: 'Élixir de sang de troll mineur' }]), exportedAt: 1_800_000_200 }));
		expect(known(brena.id)![0].recipes[0].icon).toBe('inv_potion_78');
	});

	it("une icône au nom bizarre n'est pas gardée", async () => {
		const odd = (async () => new Response(JSON.stringify({ name: 'X', icon: '../../evil"' }))) as unknown as typeof fetch;
		expect(await fetchWowheadSpell(1, odd)).toEqual({ name: 'X', icon: '' });
	});
});
