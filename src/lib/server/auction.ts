import { inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { BattlenetError, getDynamic, isConfigured } from './battlenet';
import { db, schema } from './db';
import { getCrafts, setAuctionStatus } from './settings';

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

/** Relit les prix de l'HV choisi et remplace ceux de la base. */
export async function refreshPrices(fetchFn: Fetch = fetch) {
	const { auctionRuleset, auctionHouse } = getCrafts();
	if (!auctionRuleset || !auctionHouse) return { ok: false, message: 'Aucun hôtel des ventes choisi.' };
	try {
		const data = commoditiesSchema.parse((await getDynamic(`/data/wow/ruleset/${auctionRuleset}/auctions/${auctionHouse}/commodities`, fetchFn)) ?? {});
		const prices = summarize(data.auctions);
		if (!prices.length) throw new BattlenetError('Battle.net ne donne aucun prix pour cet hôtel des ventes.');
		const now = new Date();
		db().transaction((tx) => {
			tx.delete(schema.auctionPrices).run();
			for (let i = 0; i < prices.length; i += 500) tx.insert(schema.auctionPrices).values(prices.slice(i, i + 500).map((p) => ({ ...p, updatedAt: now }))).run();
		});
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
