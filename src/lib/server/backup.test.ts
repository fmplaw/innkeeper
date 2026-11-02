import { existsSync, mkdtempSync, readdirSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { backupDatabase, backupIfDue, backupSettings, newestBackupAt } from './backup';
import { db, schema } from './db';

const source = () => {
	db(); // crée la base de test et applique les migrations
	return process.env.DATABASE_PATH!;
};
const tempDir = () => mkdtempSync(join(tmpdir(), 'innkeeper-backups-'));
const HOUR = 3600_000;

describe('sauvegarde de la base', () => {
	it('copie la base à chaud dans un fichier daté, lisible', async () => {
		db().insert(schema.auditLog).values({ actorType: 'system', actorName: 'Système', action: 'guild.update' }).run();
		const dir = join(tempDir(), 'sous-dossier');
		const { file } = await backupDatabase({ source: source(), dir, keep: 14, now: new Date('2026-11-04T03:00:00Z') });
		expect(file).toBe(join(dir, 'guilde-2026-11-04-03-00.db'));
		const copy = new Database(file, { readonly: true });
		expect((copy.prepare('select count(*) as n from audit_log').get() as { n: number }).n).toBeGreaterThan(0);
		copy.close();
	});

	it('ne garde que les copies les plus récentes', async () => {
		const dir = tempDir();
		for (const day of ['01', '02', '03']) writeFileSync(join(dir, `guilde-2026-11-${day}-03-00.db`), '');
		writeFileSync(join(dir, 'autre-fichier.db'), '');
		const { removed } = await backupDatabase({ source: source(), dir, keep: 2, now: new Date('2026-11-04T03:00:00Z') });
		expect(removed).toBe(2);
		expect(readdirSync(dir).sort()).toEqual(['autre-fichier.db', 'guilde-2026-11-03-03-00.db', 'guilde-2026-11-04-03-00.db']);
	});

	it('date la copie la plus récente, ou rien sans copie ni dossier', () => {
		const dir = tempDir();
		expect(newestBackupAt(dir)).toBeNull();
		expect(newestBackupAt(join(dir, 'absent'))).toBeNull();
		writeFileSync(join(dir, 'guilde-a.db'), '');
		writeFileSync(join(dir, 'guilde-b.db'), '');
		utimesSync(join(dir, 'guilde-a.db'), new Date('2026-11-01T00:00:00Z'), new Date('2026-11-01T00:00:00Z'));
		utimesSync(join(dir, 'guilde-b.db'), new Date('2026-11-03T00:00:00Z'), new Date('2026-11-03T00:00:00Z'));
		expect(newestBackupAt(dir)).toBe(Date.parse('2026-11-03T00:00:00Z'));
	});

	it('lit ses réglages dans l’environnement, 0 désactive', () => {
		const saved = { ...process.env };
		try {
			delete process.env.BACKUP_INTERVAL_HOURS;
			delete process.env.BACKUP_DIR;
			delete process.env.BACKUP_KEEP;
			expect(backupSettings()).toMatchObject({ dir: '/backups', keep: 14, intervalHours: 24 });
			Object.assign(process.env, { BACKUP_INTERVAL_HOURS: '6', BACKUP_DIR: '/srv/copies', BACKUP_KEEP: '30' });
			expect(backupSettings()).toMatchObject({ dir: '/srv/copies', keep: 30, intervalHours: 6 });
			process.env.BACKUP_INTERVAL_HOURS = '0';
			expect(backupSettings()).toBeNull();
		} finally {
			process.env = saved;
		}
	});

	it('sauvegarde seulement quand la dernière copie a fait son temps', async () => {
		const dir = tempDir();
		const options = { source: source(), dir, keep: 14, intervalHours: 24 };
		const first = new Date('2026-11-04T03:00:00Z');
		expect(await backupIfDue({ ...options, now: first })).toBe(join(dir, 'guilde-2026-11-04-03-00.db'));
		utimesSync(join(dir, 'guilde-2026-11-04-03-00.db'), first, first);

		expect(await backupIfDue({ ...options, now: new Date(first.getTime() + 23 * HOUR) })).toBeNull();
		// Le contrôle passe toutes les heures : quelques minutes d'avance ne repoussent pas la copie d'un jour.
		const next = await backupIfDue({ ...options, now: new Date(first.getTime() + 24 * HOUR - 5 * 60_000) });
		expect(next).toBe(join(dir, 'guilde-2026-11-05-02-55.db'));
		expect(existsSync(next!)).toBe(true);
	});
});
