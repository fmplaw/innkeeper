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
});
