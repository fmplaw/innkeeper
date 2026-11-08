// Recettes rangées comme dans la fenêtre du métier en jeu : par sous-section (« Bandages »,
// « Remèdes »…), dans l'ordre de l'export, qui suit celui du jeu. Les recettes d'un ancien
// export, sans sous-section, vont dans « Autres », à la fin.

export const OTHER_CATEGORY = 'Autres';

export interface RecipeGroup<R> {
	category: string | null;
	recipes: R[];
}

export function groupRecipes<R extends { name: string; category?: string | null }>(recipes: R[]): RecipeGroup<R>[] {
	const groups = new Map<string | null, R[]>();
	for (const r of recipes) {
		const key = r.category?.trim() || null;
		const list = groups.get(key) ?? [];
		list.push(r);
		groups.set(key, list);
	}
	const byName = (a: R, b: R) => a.name.localeCompare(b.name, 'fr');
	const named = [...groups].filter(([k]) => k !== null).map(([category, list]) => ({ category, recipes: list.toSorted(byName) }));
	const other = groups.get(null);
	return other ? [...named, { category: named.length ? OTHER_CATEGORY : null, recipes: other.toSorted(byName) }] : named;
}

/** Ancre d'un métier d'un perso sur sa fiche joueur (lien depuis la page Artisans). */
export const recipesAnchor = (characterId: number, profession: string) => `recettes-${characterId}-${profession}`;

// ── Composants et coût ────────────────────────────────────────────────────────

export interface ReagentLike {
	id: number;
	name?: string | null;
	count: number;
}

/** Nombre de fabrications pour obtenir `quantity` objets (une recette peut en donner plusieurs). */
export const craftsFor = (quantity: number, made: number | null | undefined) => Math.ceil(quantity / Math.max(made ?? 1, 1));

export const reagentName = (r: ReagentLike) => r.name || `objet ${r.id}`;

/** « 6 Feuillargent, 3 Fiole vide » pour `crafts` fabrications. */
export const reagentList = (reagents: ReagentLike[], crafts = 1) => reagents.map((r) => `${r.count * crafts} ${reagentName(r)}`).join(', ');

/**
 * Coût des composants à l'hôtel des ventes (pc) pour `crafts` fabrications. `missing` : composants
 * sans prix (vendus par un marchand, ou absents de l'HV), l'estimation est alors partielle.
 * null si aucun composant n'a de prix.
 */
export function reagentCost(reagents: ReagentLike[] | null | undefined, crafts: number, prices: Record<number, number>) {
	if (!reagents?.length) return null;
	let total = 0;
	const missing: string[] = [];
	for (const r of reagents) {
		const price = prices[r.id];
		if (price === undefined) missing.push(reagentName(r));
		else total += price * r.count * crafts;
	}
	return missing.length === reagents.length ? null : { total, missing };
}
