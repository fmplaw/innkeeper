// Change le numéro de version partout : package.json, package-lock.json, image des
// fichiers compose, et section « Non publié » du CHANGELOG renommée à la date du jour.
//   node scripts/version.mjs 0.9.2
// Ensuite : committer, puis `git tag -a v0.9.2` et pousser le tag séparément de la branche.
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
	console.error('Usage : node scripts/version.mjs X.Y.Z');
	process.exit(1);
}

const edit = (file, change) => {
	const before = readFileSync(file, 'utf8');
	const after = change(before);
	if (after === before) throw new Error(`${file} : rien à modifier`);
	writeFileSync(file, after);
	console.log(`${file} mis à jour`);
};

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const previous = pkg.version;
if (previous === version) throw new Error(`Déjà en version ${version}`);

edit('package.json', (s) => s.replace(`"version": "${previous}"`, `"version": "${version}"`));
edit('package-lock.json', (s) => {
	const lock = JSON.parse(s);
	lock.version = version;
	lock.packages[''].version = version;
	return JSON.stringify(lock, null, s.split('\n')[1].startsWith('\t') ? '\t' : 2) + '\n';
});
for (const file of ['docker-compose.yml', 'docker-compose.traefik.yml'])
	edit(file, (s) => s.replace(/(image: ghcr\.io\/[\w.-]+\/innkeeper:)[\w.-]+/, `$1${version}`));
edit('CHANGELOG.md', (s) => {
	const today = new Date().toISOString().slice(0, 10);
	const repo = s.match(/\[Non publié\]: (\S+)\/compare\//)[1];
	return s
		.replace('## [Non publié]\n', `## [Non publié]\n\n## [${version}] - ${today}\n`)
		.replace(
			/\[Non publié\]: \S+\n/,
			`[Non publié]: ${repo}/compare/v${version}...HEAD\n[${version}]: ${repo}/compare/v${previous}...v${version}\n`
		);
});
