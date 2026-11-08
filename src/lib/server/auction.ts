import { eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { VENDOR_REAGENTS } from '$lib/game/vendor-reagents';
import { BattlenetError, getDynamic, isConfigured } from './battlenet';
import { db, schema } from './db';
import type { KnownRecipes } from './db/schema';
import { getCrafts, getItemNames, getVendorPrices, setAuctionStatus, setItemNames, setVendorPrices } from './settings';

// Prix de l'hôtel des ventes de Forever, lus sur Battle.net. Forever range ses HV par type de
// règles (JcE, JcJ…), chacun avec plusieurs HV par faction : la guilde choisit le sien dans
// Admin → Commandes de craft. Les composants (plantes, minerais, étoffes…) sont des
// « commodities », vendus à l'unité. On garde, pour chaque objet, le prix moyen des 20 unités les
// moins chères : le tout premier prix est souvent une affaire isolée.

type Fetch = typeof fetch;

export const AUCTION_EVERY_MS = 3_600_000;
/** Nombre d'unités les moins chères dont on fait la moyenne. */
export const CHEAPEST_UNITS = 20;
/** Au-delà, les prix sont trop vieux pour une estimation. */
const STALE_MS = 24 * 3_600_000;

const indexSchema = z.object({ rulesets: z.array(z.object({ id: z.number().int() })).default([]) });
const rulesetSchema = z.object({ id: z.number().int(), name: z.string() });
const housesSchema = z.object({ auctions: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]) });
const itemSchema = z.object({ name: z.string().nullish(), purchase_price: z.number().int().nullish(), purchase_quantity: z.number().int().nullish() });
const commoditiesSchema = z.object({
	auctions: z.array(z.object({ item: z.object({ id: z.number().int() }), quantity: z.number().int(), unit_price: z.number().int() })).default([])
});

export interface AuctionHouseChoice {
	ruleset: number;
	rulesetName: string;
	house: number;
	name: string;
}

/** Hôtels des ventes de Forever, par type de règles (pour la liste d'Admin → Commandes de craft). */
export async function listAuctionHouses(fetchFn: Fetch = fetch): Promise<AuctionHouseChoice[]> {
	const index = indexSchema.parse(await getDynamic('/data/wow/ruleset/index', fetchFn));
	const result: AuctionHouseChoice[] = [];
	for (const { id } of index.rulesets.toSorted((a, b) => a.id - b.id)) {
		const ruleset = rulesetSchema.parse(await getDynamic(`/data/wow/ruleset/${id}`, fetchFn));
		const houses = housesSchema.parse((await getDynamic(`/data/wow/ruleset/${id}/auctions/index`, fetchFn)) ?? {});
		for (const h of houses.auctions) result.push({ ruleset: id, rulesetName: ruleset.name, house: h.id, name: h.name });
	}
	return result;
}

/** Prix par objet : moyenne des `CHEAPEST_UNITS` unités les moins chères, plus bas prix, quantité en vente. */
export function summarize(lots: { item: { id: number }; quantity: number; unit_price: number }[]) {
	const byItem = new Map<number, { quantity: number; unit_price: number }[]>();
	for (const lot of lots) byItem.set(lot.item.id, [...(byItem.get(lot.item.id) ?? []), lot]);
	return [...byItem].map(([itemId, list]) => {
		list.sort((a, b) => a.unit_price - b.unit_price);
		let units = 0;
		let total = 0;
		for (const lot of list) {
			const take = Math.min(lot.quantity, CHEAPEST_UNITS - units);
			units += take;
			total += take * lot.unit_price;
			if (units >= CHEAPEST_UNITS) break;
		}
		return { itemId, unitPrice: Math.round(total / Math.max(units, 1)), minPrice: list[0].unit_price, quantity: list.reduce((n, l) => n + l.quantity, 0) };
	});
}

/**
 * Prix unitaires (pc) des composants vendus par les marchands, d'après Battle.net. Ils ne changent
 * pas : demandés une fois par objet, puis gardés. Un objet introuvable est simplement ignoré.
 */
export async function vendorPrices(fetchFn: Fetch = fetch) {
	const known = { ...getVendorPrices() };
	const missing = Object.keys(VENDOR_REAGENTS)
		.map(Number)
		.filter((id) => known[id] === undefined);
	for (const id of missing) {
		try {
			const item = itemSchema.parse((await getDynamic(`/data/wow/item/${id}`, fetchFn, 'static')) ?? {});
			// 0 : inconnu de Battle.net ou sans prix, pour ne pas le redemander toutes les heures.
			known[id] = item.purchase_price ? Math.max(1, Math.round(item.purchase_price / Math.max(item.purchase_quantity ?? 1, 1))) : 0;
		} catch {
			// Panne : réessayé à la prochaine lecture.
		}
	}
	if (missing.length) setVendorPrices(known);
	return known;
}

/** Ajoute les composants des marchands : le prix du marchand, ou celui de l'HV s'il est moins cher. */
export function withVendorPrices(prices: ReturnType<typeof summarize>, vendor: Record<number, number>) {
	const byItem = new Map(prices.map((p) => [p.itemId, p]));
	for (const [id, price] of Object.entries(vendor)) {
		if (price <= 0) continue;
		const itemId = Number(id);
		const auction = byItem.get(itemId);
		if (auction) {
			auction.unitPrice = Math.min(auction.unitPrice, price);
			auction.minPrice = Math.min(auction.minPrice, price);
		} else byItem.set(itemId, { itemId, unitPrice: price, minPrice: price, quantity: 0 });
	}
	return [...byItem.values()];
}

/** Composants sans nom dans les fiches (objet jamais affiché en jeu au moment de l'export). */
function unnamedReagents() {
	const rows = db().select({ known: schema.characters.knownRecipes }).from(schema.characters).where(isNotNull(schema.characters.knownRecipes)).all();
	return [...new Set(rows.flatMap((r) => (r.known ?? []).flatMap((k) => k.recipes.flatMap((x) => (x.reagents ?? []).filter((g) => !g.name).map((g) => g.id)))))];
}

/** Donne leur nom aux composants qui n'en ont pas, d'après une liste (id → nom) ; renvoie la même liste si rien ne change. */
export function nameReagents(known: KnownRecipes[], names: Record<number, string>): KnownRecipes[] {
	let changed = false;
	const result = known.map((k) => ({
		...k,
		recipes: k.recipes.map((r) => {
			if (!r.reagents?.some((g) => !g.name && names[g.id])) return r;
			changed = true;
			return { ...r, reagents: r.reagents.map((g) => (!g.name && names[g.id] ? { ...g, name: names[g.id] } : g)) };
		})
	}));
	return changed ? result : known;
}

/**
 * Le jeu ne connaît le nom d'un objet qu'une fois affiché : l'addon exporte parfois un composant
 * sans nom. Battle.net donne son nom français ; gardé, puis écrit dans les fiches concernées.
 */
export async function fillReagentNames(fetchFn: Fetch = fetch, max = 100) {
	const names = { ...getItemNames() };
	const missing = unnamedReagents().filter((id) => names[id] === undefined).slice(0, max);
	for (const id of missing) {
		try {
			const item = itemSchema.parse((await getDynamic(`/data/wow/item/${id}`, fetchFn, 'static')) ?? {});
			if (item.name) names[id] = item.name;
		} catch {
			// Réessayé à la prochaine lecture.
		}
	}
	if (missing.length) setItemNames(names);
	const rows = db().select({ id: schema.characters.id, known: schema.characters.knownRecipes }).from(schema.characters).where(isNotNull(schema.characters.knownRecipes)).all();
	for (const r of rows) {
		const named = nameReagents(r.known!, names);
		if (named !== r.known) db().update(schema.characters).set({ knownRecipes: named }).where(eq(schema.characters.id, r.id)).run();
	}
}

/** Relit les prix de l'HV choisi et remplace ceux de la base. */
export async function refreshPrices(fetchFn: Fetch = fetch) {
	const { auctionRuleset, auctionHouse } = getCrafts();
	if (!auctionRuleset || !auctionHouse) return { ok: false, message: 'Aucun hôtel des ventes choisi.' };
	try {
		const data = commoditiesSchema.parse((await getDynamic(`/data/wow/ruleset/${auctionRuleset}/auctions/${auctionHouse}/commodities`, fetchFn)) ?? {});
		if (!data.auctions.length) throw new BattlenetError('Battle.net ne donne aucun prix pour cet hôtel des ventes.');
		const prices = withVendorPrices(summarize(data.auctions), await vendorPrices(fetchFn));
		const now = new Date();
		db().transaction((tx) => {
			tx.delete(schema.auctionPrices).run();
			for (let i = 0; i < prices.length; i += 500) tx.insert(schema.auctionPrices).values(prices.slice(i, i + 500).map((p) => ({ ...p, updatedAt: now }))).run();
		});
		await fillReagentNames(fetchFn);
		const message = `${prices.length} objets à l’hôtel des ventes.`;
		setAuctionStatus({ at: now.getTime(), ok: true, message });
		return { ok: true, message };
	} catch (e) {
		const message = e instanceof BattlenetError ? e.message : `Prix de l’hôtel des ventes indisponibles (${e instanceof Error ? e.message : e}).`;
		setAuctionStatus({ at: Date.now(), ok: false, message });
		return { ok: false, message };
	}
}

/** Toutes les heures, si Battle.net est connecté et un HV choisi. */
export function startAuctionSchedule() {
	if (process.env.VITEST) return;
	const tick = () => {
		const { auctionHouse } = getCrafts();
		if (isConfigured() && auctionHouse) refreshPrices().catch((e) => console.warn('Hôtel des ventes :', e));
	};
	setTimeout(tick, 90_000).unref();
	setInterval(tick, AUCTION_EVERY_MS).unref();
}

// ── Estimation ────────────────────────────────────────────────────────────────

/**
 * Prix unitaires connus (pc) des objets demandés, s'ils ne sont pas trop vieux, et la date de la
 * plus récente lecture. Le calcul lui-même est dans $lib/recipes (reagentCost), partagé avec la page.
 */
export function priceTable(itemIds: number[], now = Date.now()): { prices: Record<number, number>; at: number | null } {
	const ids = [...new Set(itemIds)];
	if (!ids.length) return { prices: {}, at: null };
	const rows = db().select().from(schema.auctionPrices).where(inArray(schema.auctionPrices.itemId, ids)).all();
	const fresh = rows.filter((r) => now - r.updatedAt.getTime() < STALE_MS);
	return { prices: Object.fromEntries(fresh.map((r) => [r.itemId, r.unitPrice])), at: fresh.length ? Math.max(...fresh.map((r) => r.updatedAt.getTime())) : null };
}

/** Pour les tests et Admin : nombre d'objets dont le prix est connu. */
export const pricedItems = () => db().select({ n: sql<number>`count(*)` }).from(schema.auctionPrices).get()?.n ?? 0;
