// Ce dont le cœur a besoin du système : lire des dossiers et des fichiers, appeler le site.
// Fourni par Tauri dans l'application, par Node dans les tests.

export interface FileState {
	mtimeMs: number;
	size: number;
}

export interface Platform {
	/** Sous-dossiers d'un dossier (vide s'il n'existe pas ou n'est pas lisible). */
	subdirs(path: string): Promise<string[]>;
	exists(path: string): Promise<boolean>;
	stat(path: string): Promise<FileState | null>;
	readFile(path: string): Promise<Uint8Array>;
	fetch(url: string, init: RequestInit): Promise<Response>;
	now(): number;
}

/** Assemble un chemin avec le séparateur du chemin de départ (\ sous Windows, / ailleurs). */
export function joinPath(base: string, ...parts: string[]) {
	const sep = base.includes('\\') ? '\\' : '/';
	return [base.replace(/[\\/]+$/, ''), ...parts.map((p) => p.replace(/^[\\/]+|[\\/]+$/g, ''))].join(sep);
}
