// Contrôle du dossier drizzle/ : un numéro par migration, et le journal de Drizzle
// (meta/_journal.json) qui reprend exactement les fichiers, dans l'ordre.
// Le cas visé : deux pull requests ont généré chacune leur migration avec le même numéro.

type Journal = { entries: { idx: number; tag: string }[] };

const number = (name: string) => name.match(/^(\d+)_/)?.[1];

/** Problèmes trouvés, en français ; tableau vide si tout est cohérent. */
export function migrationProblems(sqlFiles: string[], journal: Journal): string[] {
	const problems: string[] = [];
	const tags = sqlFiles.map((f) => f.replace(/\.sql$/, '')).sort();

	const byNumber = new Map<string, string[]>();
	for (const tag of tags) {
		const n = number(tag);
		if (!n) problems.push(`${tag}.sql : nom sans numéro.`);
		else byNumber.set(n, [...(byNumber.get(n) ?? []), tag]);
	}
	for (const [n, same] of byNumber)
		if (same.length > 1)
			problems.push(`Migrations ${n} en double : ${same.join(', ')}. Garde la première, supprime l'autre et relance npm run db:generate.`);

	const inJournal = new Set(journal.entries.map((e) => e.tag));
	for (const tag of tags) if (!inJournal.has(tag)) problems.push(`${tag}.sql absent du journal (drizzle/meta/_journal.json).`);
	for (const { tag } of journal.entries) if (!tags.includes(tag)) problems.push(`Entrée ${tag} du journal sans fichier .sql.`);

	journal.entries.forEach((e, i) => {
		if (e.idx !== i) problems.push(`Entrée ${e.tag} du journal : numéro ${e.idx}, attendu ${i}.`);
		else if (Number(number(e.tag)) !== i) problems.push(`Entrée ${e.tag} du journal : fichier numéroté ${number(e.tag)}, attendu ${i}.`);
	});
	return problems;
}
