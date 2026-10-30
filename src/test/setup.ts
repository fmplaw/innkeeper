import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { vi } from 'vitest';

// Base SQLite temporaire propre à chaque fichier de test, créée avec les vraies migrations.
process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'guilde-test-')), 'test.db');
process.env.MIGRATIONS_DIR = resolve('drizzle');
process.env.ORIGIN = 'https://guilde.test';

// En test, il n'y a pas de serveur SvelteKit pour remplir $env : on lit process.env.
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
