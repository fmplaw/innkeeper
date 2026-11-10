import { eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from './db';
import type { KnownRecipes } from './db/schema';

// Noms français des recettes. L'addon exporte les noms dans la langue du jeu : un membre qui
// joue en anglais remplirait le site de « Enchant Bracer - Minor Stamina ». On garde donc un
// dictionnaire numéro → nom français, rempli par les exports d'un jeu en français et, à défaut,
// par Wowhead (seul le numéro de la recette lui est envoyé). Wowhead donne aussi l'icône de
// chaque recette, gardée ici et recopiée dans les fiches comme les noms.

const WOWHEAD_TOOLTIP = 'https://nether.wowhead.com/tooltip/spell';
// dataEnv 16 : WoW Forever (CLASSICPLUS) ; locale 2 : français.
const WOWHEAD_QUERY = 'dataEnv=16&locale=2';
const PARALLEL = 4;

export const isFrench = (locale: string | null | undefined) => !!locale && /^fr/i.test(locale);

/** Retient les noms d'un export fait avec un jeu en français. */
export function learnFrenchNames(known: KnownRecipes[]) {
	const rows = known
		.flatMap((k) => k.recipes)
		.map((r) => ({
			id: r.id,
			name: r.name,
			source: 'game' as const,
			updatedAt: new Date()
		}));
	for (let i = 0; i < rows.length; i += 200) {
		const chunk = rows.slice(i, i + 200);
		db()
			.insert(schema.recipeNames)
			.values(chunk)
			.onConflictDoUpdate({
				target: schema.recipeNames.id,
				set: {
					name: sql`excluded.name`,
					source: 'game',
					updatedAt: new Date()
				}
			})
			.run();
	}
}

function frenchNames(ids: number[]) {
	const names = new Map<number, { name: string; icon: string | null }>();
	for (let i = 0; i < ids.length; i += 500) {
		const rows = db()
			.select({ id: schema.recipeNames.id, name: schema.recipeNames.name, icon: schema.recipeNames.icon })
			.from(schema.recipeNames)
			.where(inArray(schema.recipeNames.id, ids.slice(i, i + 500)))
			.all();
		for (const r of rows) names.set(r.id, { name: r.name, icon: r.icon });
	}
	return names;
}

/** Remplace les noms connus en français et ajoute les icônes ; renvoie la même liste si rien ne change. */
export function translateRecipes(known: KnownRecipes[]): KnownRecipes[] {
	const names = frenchNames([...new Set(known.flatMap((k) => k.recipes.map((r) => r.id)))]);
	let changed = false;
	const result = known.map((k) => ({
		...k,
		recipes: k.recipes.map((r) => {
			const fr = names.get(r.id);
			if (!fr) return r;
			const name = fr.name;
			const icon = fr.icon || r.icon || null;
			if (name === r.name && (icon ?? null) === (r.icon ?? null)) return r;
			changed = true;
			return icon ? { ...r, name, icon } : { ...r, name };
		})
	}));
	return changed ? result : known;
}

type Fetch = typeof fetch;

/** Nom français et icône d'un sort sur Wowhead ; null si inconnu ou injoignable. */
export async function fetchWowheadSpell(id: number, fetchFn: Fetch = fetch): Promise<{ name: string; icon: string } | null> {
	try {
		const res = await fetchFn(`${WOWHEAD_TOOLTIP}/${id}?${WOWHEAD_QUERY}`, {
			signal: AbortSignal.timeout(8_000)
		});
		if (!res.ok) return null;
		const body = (await res.json()) as { name?: unknown; icon?: unknown };
		if (typeof body.name !== 'string' || !body.name.trim()) return null;
		// Nom de fichier seulement (il finit dans une adresse d'image) ; '' si absent ou bizarre.
		const icon = typeof body.icon === 'string' && /^[a-z0-9_-]{1,80}$/i.test(body.icon) ? body.icon.toLowerCase() : '';
		return { name: body.name.trim().slice(0, 120), icon };
	} catch {
		return null;
	}
}

/** Nom français d'un sort sur Wowhead ; null si inconnu ou injoignable. */
export async function fetchWowheadName(id: number, fetchFn: Fetch = fetch): Promise<string | null> {
	return (await fetchWowheadSpell(id, fetchFn))?.name ?? null;
}

// Numéros que Wowhead ne connaît pas : pas redemandés avant le prochain redémarrage.
const unknownIds = new Set<number>();
let running: Promise<number> | null = null;

/**
 * Demande à Wowhead les noms français et les icônes qui manquent, puis met à jour les fiches. Tourne en
 * arrière-plan après chaque import (et au démarrage) ; un seul passage à la fois.
 * Renvoie le nombre de fiches retraduites.
 */
export function translateInBackground(fetchFn: Fetch = fetch): Promise<number> {
	running ??= translateAll(fetchFn).finally(() => (running = null));
	return running;
}

async function translateAll(fetchFn: Fetch) {
	const characters = db()
		.select({
			id: schema.characters.id,
			knownRecipes: schema.characters.knownRecipes
		})
		.from(schema.characters)
		.where(isNotNull(schema.characters.knownRecipes))
		.all();
	const ids = [...new Set(characters.flatMap((c) => (c.knownRecipes ?? []).flatMap((k) => k.recipes.map((r) => r.id))))];
	const known = frenchNames(ids);
	// Sans nom français, ou nom appris du jeu mais icône jamais demandée.
	const missing = ids.filter((id) => (known.get(id)?.icon ?? null) === null && !unknownIds.has(id));

	for (let i = 0; i < missing.length; i += PARALLEL) {
		const batch = missing.slice(i, i + PARALLEL);
		const spells = await Promise.all(batch.map((id) => fetchWowheadSpell(id, fetchFn)));
		batch.forEach((id, n) => {
			const spell = spells[n];
			if (!spell) return void unknownIds.add(id);
			// Le nom appris d'un export en français prime : on n'ajoute alors que l'icône.
			if (known.has(id)) db().update(schema.recipeNames).set({ icon: spell.icon }).where(eq(schema.recipeNames.id, id)).run();
			else db().insert(schema.recipeNames).values({ id, name: spell.name, source: 'wowhead', icon: spell.icon, updatedAt: new Date() }).onConflictDoNothing().run();
		});
	}

	let changed = 0;
	for (const c of characters) {
		const fresh = db().select({ knownRecipes: schema.characters.knownRecipes }).from(schema.characters).where(eq(schema.characters.id, c.id)).get();
		if (!fresh?.knownRecipes) continue;
		const translated = translateRecipes(fresh.knownRecipes);
		if (translated === fresh.knownRecipes) continue;
		db().update(schema.characters).set({ knownRecipes: translated }).where(eq(schema.characters.id, c.id)).run();
		changed++;
	}
	return changed;
}

/** Lance la traduction sans l'attendre (pas pendant les tests : pas d'appel extérieur). */
export function scheduleTranslation() {
	if (process.env.VITEST) return;
	translateInBackground().catch((e) => console.warn('Traduction des recettes :', e));
}
