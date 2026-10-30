import { describe, expect, it } from 'vitest';
import { sortRows } from './sort';

const rows = [
	{ name: 'Édrasil', level: 12 },
	{ name: 'baudouin', level: 60 },
	{ name: 'Zha', level: null },
	{ name: 'Archibald', level: 2 },
	{ name: '', level: 12 }
];

describe('tri des tableaux', () => {
	it('trie le texte à la française, sans tenir compte des accents ni de la casse', () => {
		expect(sortRows(rows, (r) => r.name, 'asc').map((r) => r.name)).toEqual(['Archibald', 'baudouin', 'Édrasil', 'Zha', '']);
	});

	it('trie les nombres comme des nombres, dans les deux sens', () => {
		expect(sortRows(rows, (r) => r.level, 'asc').map((r) => r.level)).toEqual([2, 12, 12, 60, null]);
		expect(sortRows(rows, (r) => r.level, 'desc').map((r) => r.level)).toEqual([60, 12, 12, 2, null]);
	});

	it('garde les valeurs vides à la fin et l’ordre d’origine à égalité', () => {
		expect(sortRows(rows, (r) => r.level, 'desc').map((r) => r.name)).toEqual(['baudouin', 'Édrasil', '', 'Archibald', 'Zha']);
		expect(sortRows(rows, (r) => r.name, 'desc').at(-1)?.name).toBe('');
	});

	it('ne modifie pas le tableau d’origine', () => {
		sortRows(rows, (r) => r.name, 'asc');
		expect(rows[0].name).toBe('Édrasil');
	});
});
