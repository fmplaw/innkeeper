import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeSiteUrl, parseConfig, parseConnectLink } from './config';
import { FILE_NAME, findExports, guessGameDirs, looksLikeGameDir } from './files';
import { joinPath, type Platform } from './platform';
import { Tracker } from './tracker';

// Platform sur le vrai disque, avec Node (l'application utilise celle de Tauri).
const node: Platform = {
	subdirs: async (p) => {
		try {
			return readdirSync(p, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => join(p, d.name));
		} catch {
			return [];
		}
	},
	exists: async (p) => existsSync(p),
	stat: async (p) => (existsSync(p) ? { mtimeMs: statSync(p).mtimeMs, size: statSync(p).size } : null),
	readFile: async (p) => readFileSync(p),
	fetch: (url, init) => fetch(url, init),
	now: () => Date.now()
};

const exportIn = (root: string, ...parts: string[]) => {
	const dir = join(root, ...parts, 'SavedVariables');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, FILE_NAME), 'InnkeeperSyncDB = {}');
	return join(dir, FILE_NAME);
};

describe('fichiers de l’addon', () => {
	it('trouve les exports de chaque compte, à la racine du jeu ou dans un sous-dossier de version', async () => {
		const game = mkdtempSync(join(tmpdir(), 'wow-'));
		const a = exportIn(game, '_forever_', 'WTF', 'Account', 'COMPTE1');
		const b = exportIn(game, '_forever_', 'WTF', 'Account', 'COMPTE2');
		const c = exportIn(game, 'WTF', 'Account', 'ANCIEN');
		mkdirSync(join(game, '_retail_', 'WTF', 'Account', 'SANSADDON', 'SavedVariables'), { recursive: true });
		expect(await findExports(node, game)).toEqual([c, a, b].sort());
		expect(await looksLikeGameDir(node, game)).toBe(true);
		expect(await looksLikeGameDir(node, mkdtempSync(join(tmpdir(), 'vide-')))).toBe(false);
	});

	it('propose les dossiers d’installation habituels qui existent', async () => {
		const home = mkdtempSync(join(tmpdir(), 'home-'));
		expect(await guessGameDirs(node, 'linux', home)).toEqual([]);
		const wine = join(home, 'Games', 'world-of-warcraft', 'drive_c', 'Program Files (x86)', 'World of Warcraft');
		exportIn(wine, '_forever_', 'WTF', 'Account', 'X');
		expect(await guessGameDirs(node, 'linux', home)).toEqual([wine]);
	});

	it('assemble les chemins avec le bon séparateur', () => {
		expect(joinPath('C:\\Jeux\\WoW\\', 'WTF', 'Account')).toBe('C:\\Jeux\\WoW\\WTF\\Account');
		expect(joinPath('/Applications/World of Warcraft', '_forever_')).toBe('/Applications/World of Warcraft/_forever_');
	});
});

describe('détection des écritures du jeu', () => {
	it('envoie un fichier une fois stable, puis seulement après une nouvelle écriture', () => {
		const t = new Tracker();
		const at = (mtimeMs: number, size = 10) => new Map([['f', { mtimeMs, size }]]);
		expect(t.due(at(1))).toEqual([]); // premier relevé : on attend de le voir stable
		expect(t.due(at(1))).toEqual(['f']);
		t.done('f', { mtimeMs: 1, size: 10 });
		expect(t.idle(['f'], at(1))).toBe(true);
		expect(t.due(at(1))).toEqual([]);
		expect(t.due(at(2, 5))).toEqual([]); // en cours d'écriture
		expect(t.due(at(2, 12))).toEqual([]);
		expect(t.due(at(2, 12))).toEqual(['f']);
		expect(t.idle(['f'], at(2, 12))).toBe(false);
	});

	it('ignore un fichier disparu', () => {
		const t = new Tracker();
		expect(t.due(new Map([['f', null]]))).toEqual([]);
		expect(t.idle(['f'], new Map([['f', null]]))).toBe(true);
	});
});

describe('réglages', () => {
	it('normalise l’adresse du site', () => {
		expect(normalizeSiteUrl('ma-guilde.fr/')).toBe('https://ma-guilde.fr');
		expect(normalizeSiteUrl(' https://ma-guilde.fr/persos ')).toBe('https://ma-guilde.fr');
		expect(normalizeSiteUrl('http://localhost:3000')).toBe('http://localhost:3000');
		expect(normalizeSiteUrl('http://ma-guilde.fr')).toBe('https://ma-guilde.fr');
		expect(() => normalizeSiteUrl('pas une adresse')).toThrow();
	});

	it('relit les réglages enregistrés, avec des valeurs par défaut', () => {
		expect(parseConfig(null)).toBeNull();
		expect(parseConfig({ siteUrl: 'https://g.fr' })).toBeNull();
		expect(parseConfig({ siteUrl: 'https://g.fr', token: 'iks_x' })).toMatchObject({ gameDir: '', notify: true, scope: 'own' });
		expect(parseConfig({ siteUrl: 'https://g.fr', token: 'iks_x', notify: false, gameDir: 'C:\\WoW' })).toMatchObject({ notify: false, gameDir: 'C:\\WoW' });
	});

	it('lit le lien de connexion envoyé par le site, et rien d’autre', () => {
		const token = 'iks_abcdefghijklmnopqrstuvwxyz012345';
		expect(parseConnectLink(`innkeeper://connect?site=${encodeURIComponent('https://ma-guilde.fr')}&token=${token}`)).toEqual({ siteUrl: 'https://ma-guilde.fr', token });
		// Un site en http (hors poste local) passe en https : la clé ne circule jamais en clair.
		expect(parseConnectLink(`innkeeper://connect?site=http://ma-guilde.fr&token=${token}`)?.siteUrl).toBe('https://ma-guilde.fr');
		expect(parseConnectLink(`innkeeper://autre?site=https://g.fr&token=${token}`)).toBeNull();
		expect(parseConnectLink('innkeeper://connect?site=https://g.fr&token=pas-une-cle')).toBeNull();
		expect(parseConnectLink('https://g.fr')).toBeNull();
	});
});
