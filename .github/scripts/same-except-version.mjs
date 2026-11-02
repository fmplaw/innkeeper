// Ces fichiers JSON sont-ils identiques à ceux d'un tag, à leur numéro de version près ?
//   node .github/scripts/same-except-version.mjs v0.14.0 companion/package.json companion/package-lock.json
// Code de sortie 0 si oui, 1 sinon. Sert à ne pas reconstruire InnkeeperSync pour un simple changement
// de numéro (le passage de 0.0.0 à un vrai numéro, par exemple).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [ref, ...files] = process.argv.slice(2);
const withoutVersion = (text) => {
	const json = JSON.parse(text);
	delete json.version;
	if (json.packages?.['']) delete json.packages[''].version;
	return JSON.stringify(json);
};
const show = (file) => {
	try {
		return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' });
	} catch {
		return null;
	}
};
const changed = files.filter((f) => {
	const before = show(f);
	return before === null || withoutVersion(before) !== withoutVersion(readFileSync(f, 'utf8'));
});
if (changed.length) console.log(`Modifiés depuis ${ref} : ${changed.join(', ')}`);
process.exit(changed.length ? 1 : 0);
