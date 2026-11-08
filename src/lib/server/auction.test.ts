import { describe, expect, it } from 'vitest';
import { reagentCost } from '$lib/recipes';
import { horde } from '../../test/helpers';
import { CHEAPEST_UNITS, listAuctionHouses, nameReagents, priceTable, refreshPrices, summarize } from './auction';
import { resetBattlenetToken } from './battlenet';
import { battlenetSchema, craftSchema, getAuctionStatus, setBattlenet, setCrafts } from './settings';

horde();

const lot = (id: number, quantity: number, unit_price: number) => ({ item: { id }, quantity, unit_price });

function api(routes: Record<string, unknown>) {
	const seen: string[] = [];
	const fetchFn = (async (input: string | URL) => {
		const url = new URL(String(input));
		if (url.hostname === 'oauth.battle.net') return Response.json({ access_token: 'jeton', expires_in: 86399 });
		seen.push(`${url.pathname}?${url.searchParams.get('namespace')}`);
		const body = routes[url.pathname];
		return body === undefined ? new Response('', { status: 404 }) : Response.json(body);
	}) as typeof fetch;
	return { fetchFn, seen };
}

describe('prix de l’hôtel des ventes', () => {
	it('moyenne des 20 unités les moins chères, plus bas prix et quantité', () => {
		const [feuillargent] = summarize([lot(765, 5, 10), lot(765, 100, 30), lot(765, 3, 8)]);
		// 3 × 8 + 5 × 10 + 12 × 30 = 434 pour 20 unités
		expect(CHEAPEST_UNITS).toBe(20);
		expect(feuillargent).toEqual({ itemId: 765, unitPrice: 22, minPrice: 8, quantity: 108 });
		expect(summarize([lot(1, 2, 100)])[0].unitPrice).toBe(100);
	});

	it('liste les HV par type de règles, puis lit les prix de celui choisi', async () => {
		resetBattlenetToken();
		setBattlenet(battlenetSchema.parse({ clientId: 'x'.repeat(32), clientSecret: 'y'.repeat(32), guildSlug: 'le-pacte' }));
		const { fetchFn, seen } = api({
			'/data/wow/ruleset/index': { rulesets: [{ id: 2 }] },
			'/data/wow/ruleset/2': { id: 2, name: 'Normal' },
			'/data/wow/ruleset/2/auctions/index': { auctions: [{ id: 113, name: 'Hôtel des ventes de la Horde' }] },
			'/data/wow/ruleset/2/auctions/113/commodities': { auctions: [lot(765, 50, 11), lot(3371, 50, 8)] },
			// Marchands : 20 pc les 5 fioles ; l'eau de source n'est pas à l'HV.
			'/data/wow/item/3371': { purchase_price: 20, purchase_quantity: 5 },
			'/data/wow/item/159': { purchase_price: 25, purchase_quantity: 5 }
		});
		expect(await listAuctionHouses(fetchFn)).toEqual([{ ruleset: 2, rulesetName: 'Normal', house: 113, name: 'Hôtel des ventes de la Horde' }]);
		expect(seen[0]).toBe('/data/wow/ruleset/index?dynamic-forever-eu');

		expect(await refreshPrices(fetchFn)).toEqual({ ok: false, message: 'Aucun hôtel des ventes choisi.' });
		setCrafts(craftSchema.parse({ auctionRuleset: 2, auctionHouse: 113 }));
		expect(await refreshPrices(fetchFn)).toEqual({ ok: true, message: '3 objets à l’hôtel des ventes.' });
		expect(seen).toContain('/data/wow/item/3371?static-forever-eu');
		expect(getAuctionStatus()?.ok).toBe(true);

		// Élixir de Force mineure : 1 Feuillargent (11 pc à l'HV) + 1 Fiole vide (4 pc chez le marchand, moins cher que l'HV).
		const { prices, at } = priceTable([765, 3371, 159, 999]);
		expect(prices[159]).toBe(5);
		expect(at).not.toBeNull();
		const reagents = [
			{ id: 765, name: 'Feuillargent', count: 1 },
			{ id: 3371, name: 'Fiole vide', count: 1 }
		];
		expect(reagentCost(reagents, 1, prices)).toEqual({ total: 15, missing: [] });
		expect(reagentCost([...reagents, { id: 999, name: 'Poussière étrange', count: 2 }], 3, prices)).toEqual({ total: 45, missing: ['Poussière étrange'] });
		expect(reagentCost([{ id: 999, count: 1 }], 1, prices)).toBeNull();

		// Prix trop vieux : plus d'estimation.
		expect(priceTable([765], Date.now() + 25 * 3_600_000).prices).toEqual({});

		// Prix des marchands gardés : pas redemandés.
		const again = api({ '/data/wow/ruleset/2/auctions/113/commodities': { auctions: [lot(765, 50, 12)] } });
		await refreshPrices(again.fetchFn);
		expect(again.seen.some((p) => p.startsWith('/data/wow/item/'))).toBe(false);

		// HV vide ou en panne : les anciens prix restent, l'échec est noté.
		const broken = api({ '/data/wow/ruleset/2/auctions/113/commodities': { auctions: [] } });
		expect((await refreshPrices(broken.fetchFn)).ok).toBe(false);
		expect(priceTable([765]).prices).toEqual({ 765: 12 });
	});

	it('nomme les composants exportés sans nom', () => {
		const known = [{ profession: 'cooking', skill: 80, recipes: [{ id: 6499, name: 'Palourdes bouillies', reagents: [{ id: 5503, count: 1 }, { id: 159, name: 'Eau de source', count: 1 }] }] }];
		const named = nameReagents(known, { 5503: 'Viande de palourde', 159: 'Autre nom' });
		expect(named[0].recipes[0].reagents).toEqual([{ id: 5503, name: 'Viande de palourde', count: 1 }, { id: 159, name: 'Eau de source', count: 1 }]);
		expect(nameReagents(known, {})).toBe(known);
	});
});
