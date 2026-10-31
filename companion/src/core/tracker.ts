import type { FileState } from './platform';

// Décide quand envoyer un fichier : le jeu l'écrit d'un coup à la déconnexion ou au /reload ;
// on attend qu'il soit stable (même date et même taille deux relevés de suite) avant de l'envoyer.

export class Tracker {
	private sent = new Map<string, FileState>();
	private seen = new Map<string, FileState>();

	/** Fichiers à envoyer maintenant, d'après les relevés du moment. */
	due(states: Map<string, FileState | null>): string[] {
		const out: string[] = [];
		for (const [path, state] of states) {
			if (!state) continue;
			const before = this.seen.get(path);
			this.seen.set(path, state);
			const stable = before && same(before, state);
			const sent = this.sent.get(path);
			if (stable && (!sent || !same(sent, state))) out.push(path);
		}
		return out;
	}

	/** Plus rien à envoyer : chaque fichier présent a été envoyé dans son état actuel. */
	idle(files: string[], states: Map<string, FileState | null>) {
		return files.every((f) => {
			const state = states.get(f);
			const sent = this.sent.get(f);
			return !state || (sent !== undefined && same(sent, state));
		});
	}

	/** Envoi réussi (ou fichier refusé définitivement) : on ne le renverra qu'après une nouvelle écriture. */
	done(path: string, state: FileState) {
		this.sent.set(path, state);
	}
}

const same = (a: FileState, b: FileState) => a.mtimeMs === b.mtimeMs && a.size === b.size;
