import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

let instance: BetterSQLite3Database<typeof schema> | undefined;

// Connexion ouverte au premier appel (et non à l'import) pour que `vite build`
// n'ouvre pas de base. Les migrations sont appliquées à ce moment-là.
export function db() {
	if (instance) return instance;

	const path = resolve(env.DATABASE_PATH || './data/guilde.db');
	mkdirSync(dirname(path), { recursive: true });

	const sqlite = new Database(path);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	const connection = drizzle(sqlite, { schema });
	// Mise en cache seulement après des migrations réussies : sinon une erreur
	// au premier appel laisserait une base sans tables en service.
	migrate(connection, { migrationsFolder: resolve(env.MIGRATIONS_DIR || './drizzle') });
	instance = connection;
	return instance;
}

export { schema };
