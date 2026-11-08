import { describe, expect, it } from 'vitest';
import { reagentCost } from '$lib/recipes';
import { horde } from '../../test/helpers';
import { CHEAPEST_UNITS, listAuctionHouses, priceTable, refreshPrices, summarize } from './auction';
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
			'/data/wow/ruleset/2/auctions/113/commodities': { auctions: [lot(765, 50, 11), lot(3371, 50, 8)] }
		});
		expect(await listAuctionHouses(fetchFn)).toEqual([{ ruleset: 2, rulesetName: 'Normal', house: 113, name: 'Hôtel des ventes de la Horde' }]);
		expect(seen[0]).toBe('/data/wow/ruleset/index?dynamic-forever-eu');

		expect(await refreshPrices(fetchFn)).toEqual({ ok: false, message: 'Aucun hôtel des ventes choisi.' });
		setCrafts(craftSchema.parse({ auctionRuleset: 2, auctionHouse: 113 }));
		expect(await refreshPrices(fetchFn)).toEqual({ ok: true, message: '2 objets à l’hôtel des ventes.' });
		expect(getAuctionStatus()?.ok).toBe(true);

		// Élixir de Force mineure : 1 Feuillargent + 1 Fiole vide ≈ 19 pc, comme en jeu.
		const { prices, at } = priceTable([765, 3371, 999]);
		expect(at).not.toBeNull();
		const reagents = [
			{ id: 765, name: 'Feuillargent', count: 1 },
			{ id: 3371, name: 'Fiole vide', count: 1 }
		];
		expect(reagentCost(reagents, 1, prices)).toEqual({ total: 19, missing: [] });
		expect(reagentCost([...reagents, { id: 999, name: 'Eau de source', count: 2 }], 3, prices)).toEqual({ total: 57, missing: ['Eau de source'] });
		expect(reagentCost([{ id: 999, count: 1 }], 1, prices)).toBeNull();

		// Prix trop vieux : plus d'estimation.
		expect(priceTable([765], Date.now() + 25 * 3_600_000).prices).toEqual({});

		// HV vide ou en panne : les anciens prix restent, l'échec est noté.
		const broken = api({ '/data/wow/ruleset/2/auctions/113/commodities': { auctions: [] } });
		expect((await refreshPrices(broken.fetchFn)).ok).toBe(false);
		expect(priceTable([765]).prices).toEqual({ 765: 11 });
	});
});
