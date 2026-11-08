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
