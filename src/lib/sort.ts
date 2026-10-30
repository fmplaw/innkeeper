// Tri des tableaux au clic sur l'en-tête. Partagé entre serveur et navigateur.

export type SortDir = 'asc' | 'desc';
export type SortValue = string | number | null | undefined;

// Ordre alphabétique français, sans tenir compte des accents ni de la casse, « 2 » avant « 10 ».
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/**
 * Copie triée de `rows`. Les valeurs vides restent toujours à la fin, quel que soit le sens ;
 * à égalité, l'ordre d'origine est conservé.
 */
export function sortRows<T>(rows: readonly T[], value: (row: T) => SortValue, dir: SortDir): T[] {
	const sign = dir === 'asc' ? 1 : -1;
	const empty = (v: SortValue) => v === null || v === undefined || v === '';
	return [...rows].sort((a, b) => {
		const va = value(a);
		const vb = value(b);
		if (empty(va) || empty(vb)) return Number(empty(va)) - Number(empty(vb));
		const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : collator.compare(String(va), String(vb));
		return cmp * sign;
	});
}
