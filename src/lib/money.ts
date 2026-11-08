// Pièces de WoW : 1 po = 100 pa = 10 000 pc. Les montants sont gardés en pièces de cuivre.

export const COPPER_PER_SILVER = 100;
export const COPPER_PER_GOLD = 10_000;
/** Plafond d'un montant saisi (100 000 po), pour écarter les fautes de frappe. */
export const MAX_MONEY = 100_000 * COPPER_PER_GOLD;

/** « 1 po 50 pa », « 35 pc » ; null ou 0 : chaîne vide. */
export function formatMoney(copper: number | null | undefined) {
	if (!copper) return '';
	const gold = Math.floor(copper / COPPER_PER_GOLD);
	const silver = Math.floor((copper % COPPER_PER_GOLD) / COPPER_PER_SILVER);
	const rest = copper % COPPER_PER_SILVER;
	return [gold && `${gold} po`, silver && `${silver} pa`, rest && `${rest} pc`].filter(Boolean).join(' ');
}

/**
 * Lit les trois cases po / pa / pc d'un formulaire (`<nom>Gold`, `<nom>Silver`, `<nom>Copper`).
 * Cases vides : null. Renvoie une erreur si une case n'est pas un entier positif.
 */
export function readMoney(form: FormData, name: string): { value: number | null } | { error: string } {
	const parts = (['Gold', 'Silver', 'Copper'] as const).map((unit) => String(form.get(`${name}${unit}`) ?? '').trim());
	if (parts.every((p) => p === '')) return { value: null };
	const [gold, silver, copper] = parts.map((p) => (p === '' ? 0 : Number(p)));
	if (![gold, silver, copper].every((n) => Number.isInteger(n) && n >= 0)) return { error: 'Montant invalide : des nombres entiers de po, pa et pc.' };
	const value = gold * COPPER_PER_GOLD + silver * COPPER_PER_SILVER + copper;
	if (value > MAX_MONEY) return { error: 'Montant trop élevé.' };
	return { value: value || null };
}
