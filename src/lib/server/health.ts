import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// État des services extérieurs (Admin → État) : dernière réponse correcte et dernière panne de
// Discord (connexion des joueurs), du bot Discord et de Raid-Helper. Gardé en mémoire : remis à
// zéro au redémarrage, ce que la page indique. Sans ça, une panne ne se voit que dans les logs
// du conteneur, ou quand les joueurs s'en plaignent.

export type Service = 'discord' | 'bot' | 'raidhelper';
const SERVICES: Service[] = ['discord', 'bot', 'raidhelper'];
const MAX_MESSAGE = 300;

type State = { okAt: number | null; error: { at: number; message: string } | null; failures: number };
let state: Record<Service, State>;

export function resetHealth() {
	state = Object.fromEntries(SERVICES.map((s) => [s, { okAt: null, error: null, failures: 0 }])) as Record<Service, State>;
}
resetHealth();

export const startedAt = Date.now();

export function recordFailure(service: Service, message: string) {
	state[service].error = { at: Date.now(), message: message.slice(0, MAX_MESSAGE) };
	state[service].failures++;
}

const recordOk = (service: Service) => (state[service].okAt = Date.now());

/**
 * Appel suivi : `label` dit ce qui était demandé (« lecture d'une sortie »). Une réponse en
 * erreur est notée puis rendue telle quelle (l'appelant garde sa gestion) ; `expected` liste les
 * statuts normaux pour cet appel (404 : membre absent du serveur…). Une exception est notée et relancée.
 */
export async function tracked(service: Service, label: string, call: () => Promise<Response>, { expected = [] as number[] } = {}) {
	let res: Response;
	try {
		res = await call();
	} catch (e) {
		const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
		recordFailure(service, `${label} : ${timeout ? 'pas de réponse (délai dépassé)' : `injoignable (${e instanceof Error ? e.message : String(e)})`}`);
		throw e;
	}
	if (res.ok || expected.includes(res.status)) recordOk(service);
	else recordFailure(service, `${label} : réponse ${res.status}`);
	return res;
}

export const serviceHealth = (): Record<Service, State> => structuredClone(state);

/** Copie la plus récente de scripts/backup.mjs (`guilde-*.db`) dans `dir`, ou null. */
export function latestBackup(dir: string) {
	let files: string[];
	try {
		files = readdirSync(dir).filter((f) => /^guilde-.*\.db$/.test(f));
	} catch {
		return null;
	}
	// Le nom porte la date de la copie (guilde-AAAA-MM-JJ-HH-MM.db) : le plus grand est le plus récent.
	const file = files.sort().at(-1);
	if (!file) return null;
	const s = statSync(join(dir, file));
	return { file, at: s.mtimeMs, bytes: s.size };
}
