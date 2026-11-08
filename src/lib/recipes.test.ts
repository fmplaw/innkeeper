import { describe, expect, it } from 'vitest';
import { groupRecipes, recipesAnchor } from './recipes';

describe('recettes rangées comme en jeu', () => {
	it('par sous-section dans l’ordre de l’export, triées par nom, « Autres » à la fin', () => {
		const groups = groupRecipes([
			{ id: 1, name: 'Bandage en lin', category: 'Bandages' },
			{ id: 2, name: 'Anti-venin', category: 'Remèdes' },
			{ id: 3, name: 'Bandage en laine', category: 'Bandages' },
			{ id: 4, name: 'Trousse de premiers soins' }
		]);
		expect(groups.map((g) => g.category)).toEqual(['Bandages', 'Remèdes', 'Autres']);
		expect(groups[0].recipes.map((r) => r.id)).toEqual([3, 1]);
	});

	it('ancien export sans sous-section : un seul groupe, sans titre', () => {
		const groups = groupRecipes([
			{ id: 2, name: 'B', category: null },
			{ id: 1, name: 'A' }
		]);
		expect(groups).toEqual([{ category: null, recipes: [{ id: 1, name: 'A' }, { id: 2, name: 'B', category: null }] }]);
		expect(groupRecipes([])).toEqual([]);
	});

	it('ancre d’un métier sur la fiche', () => {
		expect(recipesAnchor(12, 'first-aid')).toBe('recettes-12-first-aid');
	});
});
