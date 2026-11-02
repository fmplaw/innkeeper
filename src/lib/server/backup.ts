import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';

// Sauvegarde quotidienne faite par le site lui-même : même copie à chaud et même rotation que
// scripts/backup.mjs (toujours utilisable à la main), sans cron à planifier sur la machine.

const BACKUP_FILE = /^guilde-.*\.db$/;
const CHECK_EVERY_MS = 3600_000;
// Le contrôle passe toutes les heures : une copie due dans moins d'un quart d'heure est faite tout de
// suite, sinon l'heure de la sauvegarde reculerait d'une heure chaque jour.
const SLACK_MS = 15 * 60_000;

interface BackupOptions {
	source: string;
	dir: string;
	keep: number;
	now?: Date;
}

/** Copie à chaud de la base (API backup de SQLite) dans `dir`, puis suppression des copies en trop. */
export async function backupDatabase({ source, dir, keep, now = new Date() }: BackupOptions) {
	mkdirSync(dir, { recursive: true });
	const stamp = now.toISOString().replace(/[:T]/g, '-').slice(0, 16);
	const file = join(dir, `guilde-${stamp}.db`);

	const sqlite = new Database(source, { readonly: true, fileMustExist: true });
	try {
		await sqlite.backup(file);
	} finally {
		sqlite.close();
	}

	const old = readdirSync(dir)
		.filter((f) => BACKUP_FILE.test(f))
		.sort()
		.slice(0, -keep);
	for (const f of old) rmSync(join(dir, f));
	return { file, removed: old.length };
}

/** Date (ms) de la copie la plus récente de `dir`, ou null s'il n'y en a aucune. */
export function newestBackupAt(dir: string) {
	let files: string[];
	try {
		files = readdirSync(dir).filter((f) => BACKUP_FILE.test(f));
	} catch {
		return null;
	}
	const times = files.map((f) => statSync(join(dir, f)).mtimeMs);
	return times.length ? Math.max(...times) : null;
}

/** Fait une copie si la plus récente a plus de `intervalHours` heures ; renvoie son chemin, ou null. */
export async function backupIfDue({ intervalHours, now = new Date(), ...options }: BackupOptions & { intervalHours: number }) {
	const newest = newestBackupAt(options.dir);
	if (newest !== null && now.getTime() - newest < intervalHours * 3600_000 - SLACK_MS) return null;
	return (await backupDatabase({ ...options, now })).file;
}

/** Réglages lus dans l'environnement ; null si la sauvegarde intégrée est désactivée. */
export function backupSettings() {
	const intervalHours = Number(env.BACKUP_INTERVAL_HOURS ?? 24);
	const keep = Number(env.BACKUP_KEEP || 14);
	if (!Number.isFinite(intervalHours) || intervalHours <= 0) return null;
	return {
		source: resolve(env.DATABASE_PATH || './data/guilde.db'),
		dir: resolve(env.BACKUP_DIR || '/backups'),
		keep: Number.isInteger(keep) && keep > 0 ? keep : 14,
		intervalHours
	};
}

let running = false;

/** Au démarrage puis toutes les heures : copie de la base dès que la précédente a fait son temps. */
export function scheduleBackups() {
	const settings = backupSettings();
	if (!settings) return;
	const check = async () => {
		if (running) return;
		running = true;
		try {
			const file = await backupIfDue(settings);
			if (file) console.log(`Sauvegarde : ${file}`);
		} catch (e) {
			console.error(`Sauvegarde impossible dans ${settings.dir} :`, e instanceof Error ? e.message : e);
		} finally {
			running = false;
		}
	};
	void check();
	setInterval(check, CHECK_EVERY_MS).unref();
}
