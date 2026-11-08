import { fail } from '@sveltejs/kit';
import { listAuctionHouses, pricedItems, refreshPrices, type AuctionHouseChoice } from '$lib/server/auction';
import { audit, diff } from '$lib/server/audit';
import { BattlenetError, isConfigured } from '$lib/server/battlenet';
import { BotError, botReady, textChannels } from '$lib/server/bot';
import { requireOfficer } from '$lib/server/guards';
import { craftSchema, getAuctionStatus, getCrafts, setCrafts } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireOfficer(locals);
	let channels: { id: string; name: string }[] = [];
	let channelsError: string | null = null;
	if (botReady()) {
		try {
			channels = (await textChannels()).map((c) => ({ id: c.id, name: c.name }));
		} catch (e) {
			channelsError = e instanceof BotError ? e.message : 'Discord ne répond pas.';
		}
	} else channelsError = 'Le bot n’est pas configuré (Admin → Connexion Discord) : les commandes resteront sur le site.';

	// Hôtels des ventes : seulement avec Battle.net connecté.
	const battlenet = isConfigured();
	let houses: AuctionHouseChoice[] = [];
	let housesError: string | null = null;
	if (battlenet) {
		try {
			houses = await listAuctionHouses();
		} catch (e) {
			housesError = e instanceof BattlenetError ? e.message : 'Battle.net ne répond pas : liste des hôtels des ventes indisponible.';
		}
	}
	const settings = getCrafts();
	return {
		channelId: settings.channelId,
		auction: settings.auctionRuleset && settings.auctionHouse ? `${settings.auctionRuleset}:${settings.auctionHouse}` : '',
		channels,
		channelsError,
		battlenet,
		houses,
		housesError,
		auctionStatus: getAuctionStatus(),
		pricedItems: pricedItems()
	};
};

// Actions nommées seulement : SvelteKit refuse « default » à côté d'une action nommée (erreur 500).
export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const [ruleset, house] = String(form.get('auction') ?? '').split(':');
		const parsed = craftSchema.safeParse({ channelId: form.get('channelId') ?? '', auctionRuleset: ruleset || null, auctionHouse: house || null });
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const current = getCrafts();
		setCrafts(parsed.data);
		audit(locals, 'crafts.update', { label: 'Commandes de craft', url: '/admin/commandes' }, diff(current, parsed.data, ['channelId', 'auctionRuleset', 'auctionHouse']));
		// Nouvel HV : ses prix tout de suite, sans attendre l'heure suivante.
		const changed = parsed.data.auctionHouse && (parsed.data.auctionHouse !== current.auctionHouse || parsed.data.auctionRuleset !== current.auctionRuleset);
		return { saved: true, prices: changed ? await refreshPrices() : null };
	},
	prices: async ({ locals }) => {
		requireOfficer(locals);
		return { prices: await refreshPrices() };
	}
};
