// Sauvegarde à chaud de la base SQLite (API backup de SQLite, sûre pendant
// que le site tourne) et rotation des anciennes copies.
//   docker compose exec -T site node scripts/backup.mjs
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const source = process.env.DATABASE_PATH || './data/guilde.db';
const dir = process.env.BACKUP_DIR || '/backups';
const keep = Number(process.env.BACKUP_KEEP || 14);

mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const target = join(dir, `guilde-${stamp}.db`);

const db = new Database(source, { readonly: true, fileMustExist: true });
await db.backup(target);
db.close();

const old = readdirSync(dir)
	.filter((f) => /^guilde-.*\.db$/.test(f))
	.sort()
	.slice(0, -keep);
for (const f of old) rmSync(join(dir, f));

console.log(`Sauvegarde : ${target} (${old.length} ancienne(s) supprimée(s), ${keep} conservées)`);
