import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Les fichiers compose proposent l'image de la version du projet : `scripts/version.mjs` les tient à jour.
describe('version', () => {
	const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

	it.each(['docker-compose.yml', 'docker-compose.traefik.yml'])('%s utilise l’image de la version courante', (file) => {
		expect(readFileSync(file, 'utf8')).toContain(`image: ghcr.io/fmplaw/innkeeper:${version}\n`);
	});

	it('le CHANGELOG a une section pour la version courante', () => {
		expect(readFileSync('CHANGELOG.md', 'utf8')).toContain(`## [${version}] - `);
	});

	// InnkeeperSync a son propre numéro, changé à la main quand l'application change (companion.yml).
	it('InnkeeperSync a le même numéro dans package.json et package-lock.json', () => {
		const app = JSON.parse(readFileSync('companion/package.json', 'utf8')) as { version: string };
		const lock = JSON.parse(readFileSync('companion/package-lock.json', 'utf8')) as { version: string; packages: Record<string, { version?: string }> };
		expect(app.version).toMatch(/^\d+\.\d+\.\d+$/);
		expect(lock.version).toBe(app.version);
		expect(lock.packages[''].version).toBe(app.version);
	});
});
