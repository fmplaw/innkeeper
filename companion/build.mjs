// Prépare l'interface de l'application (dist/) : TypeScript compilé par esbuild, fichiers statiques copiés.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
await build({
	entryPoints: [join(root, 'src', 'app', 'app.ts')],
	outfile: join(dist, 'app.js'),
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2022',
	logLevel: 'warning'
});
cpSync(join(root, 'src', 'app', 'ui'), dist, { recursive: true });
console.log('dist/ prêt');
