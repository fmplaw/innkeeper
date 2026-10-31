import { joinPath, type Platform } from './platform';

// Recherche des fichiers de l'addon : <dossier du jeu>/[<version>/]WTF/Account/<COMPTE>/SavedVariables/InnkeeperSync.lua.
// Le nom du sous-dossier de Forever (comme _retail_ ou _classic_) n'est pas connu d'avance :
// on regarde le dossier donné et ses sous-dossiers directs.

export const FILE_NAME = 'InnkeeperSync.lua';

/** Tous les fichiers d'export sous un dossier de jeu (un par compte WoW). */
export async function findExports(p: Platform, gameDir: string): Promise<string[]> {
	const found: string[] = [];
	for (const base of [gameDir, ...(await p.subdirs(gameDir))]) {
		for (const account of await p.subdirs(joinPath(base, 'WTF', 'Account'))) {
			const file = joinPath(account, 'SavedVariables', FILE_NAME);
			if (await p.exists(file)) found.push(file);
		}
	}
	return found.sort();
}

/** Le dossier contient-il une installation de WoW (un dossier WTF, ici ou un niveau plus bas) ? */
export async function looksLikeGameDir(p: Platform, path: string) {
	for (const base of [path, ...(await p.subdirs(path))]) if (await p.exists(joinPath(base, 'WTF'))) return true;
	return false;
}

/** Emplacements d'installation habituels, pour proposer un dossier sans rien demander. */
export async function guessGameDirs(p: Platform, os: 'windows' | 'macos' | 'linux', home: string): Promise<string[]> {
	const candidates =
		os === 'windows'
			? ['C', 'D', 'E', 'F'].flatMap((drive) => [
					`${drive}:\\Program Files (x86)\\World of Warcraft`,
					`${drive}:\\Program Files (x86)\\Battle.net\\World of Warcraft`,
					`${drive}:\\Program Files\\Battle.net\\World of Warcraft`,
					`${drive}:\\Program Files\\World of Warcraft`,
					`${drive}:\\World of Warcraft`,
					`${drive}:\\Games\\World of Warcraft`,
					`${drive}:\\Jeux\\World of Warcraft`
				])
			: os === 'macos'
				? ['/Applications/World of Warcraft', joinPath(home, 'Applications', 'World of Warcraft')]
				: [joinPath(home, 'Games', 'world-of-warcraft', 'drive_c', 'Program Files (x86)', 'World of Warcraft')];
	const found: string[] = [];
	for (const c of candidates) if ((await p.exists(c)) && (await looksLikeGameDir(p, c))) found.push(c);
	return found;
}
