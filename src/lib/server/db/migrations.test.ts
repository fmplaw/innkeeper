import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrationProblems } from './migrations-check';

// Deux pull requests qui créent chacune une migration prennent le même numéro (0015_a, 0015_b) :
// une fusion qui garde les deux laisse un journal Drizzle incohérent.

const journal = (...tags: string[]) => ({ entries: tags.map((tag, idx) => ({ idx, tag })) });

describe('cohérence des migrations', () => {
	it('accepte une suite propre', () => {
		expect(migrationProblems(['0000_init.sql', '0001_roles.sql'], journal('0000_init', '0001_roles'))).toEqual([]);
	});

	it('signale deux migrations du même numéro', () => {
		const problems = migrationProblems(
			['0000_init.sql', '0001_a.sql', '0001_b.sql'],
			{ entries: [{ idx: 0, tag: '0000_init' }, { idx: 1, tag: '0001_a' }, { idx: 1, tag: '0001_b' }] }
		);
		expect(problems.join('\n')).toMatch(/0001.*0001_a.*0001_b/);
		expect(problems.join('\n')).toMatch(/journal.*1/);
	});

	it('signale un fichier absent du journal, et une entrée sans fichier', () => {
		expect(migrationProblems(['0000_init.sql', '0001_oubli.sql'], journal('0000_init')).join('\n')).toMatch(/0001_oubli.*journal/);
		expect(migrationProblems(['0000_init.sql'], journal('0000_init', '0001_perdu')).join('\n')).toMatch(/0001_perdu.*fichier/);
	});

	it('signale un trou ou un désordre dans la numérotation', () => {
		expect(migrationProblems(['0000_init.sql', '0002_saut.sql'], { entries: [{ idx: 0, tag: '0000_init' }, { idx: 2, tag: '0002_saut' }] }).length).toBeGreaterThan(0);
	});

	it('le dossier drizzle/ du dépôt est cohérent', () => {
		const dir = join(process.cwd(), 'drizzle');
		const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
		const meta = JSON.parse(readFileSync(join(dir, 'meta', '_journal.json'), 'utf8'));
		expect(migrationProblems(files, meta)).toEqual([]);
	});
});
