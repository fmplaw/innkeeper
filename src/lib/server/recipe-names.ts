import { eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from './db';
import type { KnownRecipes } from './db/schema';

// Noms français des recettes. L'addon exporte les noms dans la langue du jeu : un membre qui
// joue en anglais remplirait le site de « Enchant Bracer - Minor Stamina ». On garde donc un
// dictionnaire numéro → nom français, rempli par les exports d'un jeu en français et, à défaut,
// par Wowhead (seul le numéro de la recette lui est envoyé).

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
	const names = new Map<number, string>();
	for (let i = 0; i < ids.length; i += 500) {
		const rows = db()
			.select({ id: schema.recipeNames.id, name: schema.recipeNames.name })
			.from(schema.recipeNames)
			.where(inArray(schema.recipeNames.id, ids.slice(i, i + 500)))
			.all();
		for (const r of rows) names.set(r.id, r.name);
	}
	return names;
}

/** Remplace les noms connus en français ; renvoie la même liste si rien ne change. */
export function translateRecipes(known: KnownRecipes[]): KnownRecipes[] {
	const names = frenchNames([...new Set(known.flatMap((k) => k.recipes.map((r) => r.id)))]);
	let changed = false;
	const result = known.map((k) => ({
		...k,
		recipes: k.recipes.map((r) => {
			const fr = names.get(r.id);
			if (!fr || fr === r.name) return r;
			changed = true;
			return { ...r, name: fr };
		})
	}));
	return changed ? result : known;
}

type Fetch = typeof fetch;

/** Nom français d'un sort sur Wowhead ; null si inconnu ou injoignable. */
export async function fetchWowheadName(id: number, fetchFn: Fetch = fetch): Promise<string | null> {
	try {
		const res = await fetchFn(`${WOWHEAD_TOOLTIP}/${id}?${WOWHEAD_QUERY}`, {
			signal: AbortSignal.timeout(8_000)
		});
		if (!res.ok) return null;
		const body = (await res.json()) as { name?: unknown };
		return typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : null;
	} catch {
		return null;
	}
}

// Numéros que Wowhead ne connaît pas : pas redemandés avant le prochain redémarrage.
const unknownIds = new Set<number>();
let running: Promise<number> | null = null;

/**
 * Demande à Wowhead les noms français qui manquent, puis traduit les fiches. Tourne en
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
	const missing = ids.filter((id) => !known.has(id) && !unknownIds.has(id));

	for (let i = 0; i < missing.length; i += PARALLEL) {
		const batch = missing.slice(i, i + PARALLEL);
		const names = await Promise.all(batch.map((id) => fetchWowheadName(id, fetchFn)));
		batch.forEach((id, n) => {
			const name = names[n];
			if (!name) return void unknownIds.add(id);
			db().insert(schema.recipeNames).values({ id, name, source: 'wowhead', updatedAt: new Date() }).onConflictDoNothing().run();
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
