import { count, eq, max } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { botReady } from '$lib/server/bot';
import { db, schema } from '$lib/server/db';
import { requireInstanceAdmin } from '$lib/server/guards';
import { latestBackup, serviceHealth, startedAt, type Service } from '$lib/server/health';
import { getDiscord, getGameImport, getGuild, getRaidHelper } from '$lib/server/settings';
import { version } from '../../../../package.json';
import type { PageServerLoad } from './$types';

// Sauvegarde jugée trop ancienne au-delà d'un jour et demi (scripts/backup.mjs planifié chaque nuit).
const BACKUP_STALE_MS = 36 * 3600_000;

export type Status = 'ok' | 'warn' | 'error' | 'idle' | 'off';

// État du site : pannes de Discord, du bot et de Raid-Helper, rôles, synchro, sauvegarde.
// Réservé à l'admin de l'instance, comme le journal (messages d'erreur techniques).
export const load: PageServerLoad = ({ locals }) => {
	requireInstanceAdmin(locals);

	const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: getGuild()?.timezone ?? 'Europe/Paris' });
	const relative = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
	const when = (ms: number | null | undefined) => {
		if (!ms) return null;
		const minutes = Math.round((ms - Date.now()) / 60_000);
		const ago =
			Math.abs(minutes) < 60
				? relative.format(minutes, 'minute')
				: Math.abs(minutes) < 48 * 60
					? relative.format(Math.round(minutes / 60), 'hour')
					: relative.format(Math.round(minutes / 1440), 'day');
		return { date: date.format(ms), ago };
	};

	const health = serviceHealth();
	const configured: Record<Service, boolean> = {
		discord: Boolean(getDiscord()),
		bot: botReady(),
		// Lecture des sorties sans clé possible, mais rien ne s'écrit (création, inscriptions).
		raidhelper: Boolean(getRaidHelper().apiKey)
	};
	const LABELS: Record<Service, { name: string; role: string }> = {
		discord: { name: 'Connexion Discord', role: 'connexion des joueurs et des candidats' },
		bot: { name: 'Bot Discord', role: 'rôles des joueurs (toutes les 10 min), annonces, arrivée des recrues' },
		raidhelper: { name: 'Raid-Helper', role: 'sorties et inscriptions' }
	};
	const services = (Object.keys(LABELS) as Service[]).map((key) => {
		const h = health[key];
		const failing = h.error && (!h.okAt || h.error.at > h.okAt);
		const status: Status = !configured[key] ? 'off' : failing ? 'error' : h.error ? 'warn' : h.okAt ? 'ok' : 'idle';
		return { key, ...LABELS[key], status, okAt: when(h.okAt), error: h.error ? { ...when(h.error.at)!, message: h.error.message } : null, failures: h.failures };
	});

	const users = schema.users;
	const roles = db()
		.select({ lastCheck: max(users.rolesCheckedAt), members: count() })
		.from(users)
		.where(eq(users.inGuild, true))
		.get();
	const lastSync = db().select({ at: max(schema.syncTokens.lastUsedAt) }).from(schema.syncTokens).get()?.at;
	const gameImport = getGameImport();

	const backupDir = env.BACKUP_DIR || '/backups';
	const backup = latestBackup(backupDir);
	const backupStatus: Status = !backup ? 'warn' : Date.now() - backup.at > BACKUP_STALE_MS ? 'warn' : 'ok';

	return {
		version,
		startedAt: when(startedAt),
		services,
		roles: { status: (configured.bot ? 'ok' : 'off') as Status, lastCheck: when(roles?.lastCheck?.getTime()), members: roles?.members ?? 0 },
		sync: { lastSync: when(lastSync?.getTime()), lastImport: gameImport ? { ...when(gameImport.appliedAt * 1000)!, rosterSize: gameImport.rosterSize } : null },
		backup: { status: backupStatus, dir: backupDir, latest: backup ? { ...when(backup.at)!, file: backup.file, megabytes: (backup.bytes / 1e6).toFixed(1) } : null }
	};
};
