import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Droits de l'application (src-tauri/capabilities). Les chemins sont des motifs glob : hors
// Windows, « \ » y est un caractère d'échappement, et un motif invalide fait échouer toute la
// permission (lecture du fichier de l'addon impossible sous Linux, sans message).
const dir = 'companion/src-tauri/capabilities';
type Permission = string | { identifier: string; allow?: { path?: string }[] };
const capabilities = readdirSync(dir).map((file) => ({
	file,
	...(JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')) as { platforms?: string[]; permissions: Permission[] })
}));
const paths = (c: (typeof capabilities)[number]) =>
	c.permissions.flatMap((p) => (typeof p === 'string' ? [] : (p.allow ?? []).map((a) => a.path).filter((x): x is string => Boolean(x))));

describe('droits de l’application', () => {
	it('aucun motif à antislash hors d’une capacité réservée à Windows', () => {
		for (const c of capabilities) {
			const windowsOnly = c.platforms?.length === 1 && c.platforms[0] === 'windows';
			if (!windowsOnly) expect(paths(c).filter((p) => p.includes('\\')), c.file).toEqual([]);
		}
	});

	it('le fichier de l’addon reste lisible sur toutes les plateformes', () => {
		const readable = capabilities
			.filter((c) => !c.platforms)
			.flatMap((c) => c.permissions)
			.filter((p): p is Exclude<Permission, string> => typeof p !== 'string' && p.identifier === 'fs:allow-read-file')
			.flatMap((p) => p.allow ?? []);
		expect(readable).toContainEqual({ path: '**/SavedVariables/InnkeeperSync.lua' });
	});
});
