import { describe, expect, it } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { artisansByProfession } from './artisans';
import { createCharacter } from './characters';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import { getWowheadTooltips, setWowheadTooltips } from './settings';

horde();

const sheet = (userId: string, name: string, professions: { id: string; level: number | null }[], extra: Record<string, unknown> = {}) =>
	createCharacter(userId, {
		name,
		surname: 'Haal',
		race: 'troll',
		class: 'shaman',
		spec: 'restoration',
		role: 'healer',
		spec2: null,
		role2: null,
		level: 20,
		professions,
		recipes: null,
		pve: null,
		pvp: null,
		notes: null,
		isMain: true,
		...extra
	});

describe('artisans', () => {
	it('regroupe les persos par métier, du plus haut niveau au plus bas, avec leurs recettes', () => {
		createUser('a1');
		createUser('a2');
		const zul = sheet('a1', 'Zul', [{ id: 'first-aid', level: 30 }, { id: 'herbalism', level: 26 }]);
		const vol = sheet('a2', 'Vol', [{ id: 'first-aid', level: 80 }]);
		// Recettes exportées par l'addon ; la Cuisine n'est pas encore sur la fiche, le niveau du jeu prime.
		db()
			.update(schema.characters)
			.set({
				knownRecipes: [
					{ profession: 'first-aid', skill: 30, recipes: [{ id: 3275, name: 'Bandage en lin' }] },
					{ profession: 'cooking', skill: 13, recipes: [{ id: 2538, name: 'Viande de loup grillée' }] }
				]
			})
			.where(eq(schema.characters.id, zul.id))
			.run();

		const professions = artisansByProfession();
		// Ordre du jeu : Herboristerie (principal) avant Cuisine et Secourisme (secondaires).
		expect(professions.map((p) => p.id)).toEqual(['herbalism', 'cooking', 'first-aid']);
		const firstAid = professions.find((p) => p.id === 'first-aid')!;
		expect(firstAid.artisans.map((a) => [a.name, a.skill, a.recipes.length])).toEqual([
			['Vol', 80, 0],
			['Zul', 30, 1]
		]);
		expect(professions.find((p) => p.id === 'cooking')!.artisans).toMatchObject([{ characterId: zul.id, player: 'Joueur a1', skill: 13 }]);
		expect(vol.id).toBeGreaterThan(0);
	});

	it('bulles Wowhead désactivées tant que la guilde ne les choisit pas', () => {
		expect(getWowheadTooltips()).toBe(false);
		setWowheadTooltips(true);
		expect(getWowheadTooltips()).toBe(true);
	});
});
