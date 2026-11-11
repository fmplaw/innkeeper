import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { readMoney } from '$lib/money';
import { act, artisanStats, canDo, canRate, listOrders, rateOrder, seesDown, type CraftAction } from '$lib/server/crafts';
import { db, schema } from '$lib/server/db';
import { requireUser, requireViewer } from '$lib/server/guards';
import { getCrafts } from '$lib/server/settings';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireViewer(locals);
	const me = locals.user ? db().select({ craftAlerts: schema.users.craftAlerts }).from(schema.users).where(eq(schema.users.discordId, locals.user.id)).get() : null;
	const who = locals.user ? { id: locals.user.id, officer: locals.user.permission === 'officer' } : locals.admin ? { id: 'admin-local', officer: true } : null;
	const viewer = { id: locals.user?.id ?? null, officer: Boolean(locals.admin || locals.user?.permission === 'officer') };
	const orders = (await listOrders()).map((o) => ({
		...o,
		// Un 👎 reste entre le demandeur, l'artisan et les officiers.
		...(o.rating === 'down' && !seesDown(o, viewer) ? { rating: null, ratingNote: null } : {}),
		can: {
			rate: Boolean(locals.user && who && canRate(o, who)),
			take: Boolean(locals.user && who && canDo('take', o, who)),
			quote: Boolean(locals.user && who && canDo('quote', o, who)),
			accept: Boolean(who && canDo('accept', o, who)),
			refuse: Boolean(who && canDo('refuse', o, who)),
			release: Boolean(who && canDo('release', o, who)),
			deliver: Boolean(who && canDo('deliver', o, who)),
			cancel: Boolean(who && canDo('cancel', o, who))
		}
	}));
	return {
		orders,
		// Les plus actifs : 👎 comptés seulement pour les officiers.
		stats: artisanStats()
			.slice(0, 5)
			.map((s) => ({ ...s, down: viewer.officer || s.playerId === viewer.id ? s.down : 0 })),
		me: locals.user?.id ?? null,
		officer: Boolean(locals.admin || locals.user?.permission === 'officer'),
		craftAlerts: me?.craftAlerts ?? false,
		announced: Boolean(getCrafts().channelId)
	};
};

// Admin local : peut fermer une commande comme un officier, sans en prendre ni en passer.
function actor(locals: App.Locals) {
	if (locals.user) return { id: locals.user.id, officer: locals.user.permission === 'officer' };
	return null;
}

const change =
	(action: CraftAction) =>
	async ({ locals, request }: RequestEvent) => {
		const who = action === 'cancel' && locals.admin ? { id: 'admin-local', officer: true } : actor(locals);
		if (!who) requireUser(locals);
		const form = await request.formData();
		const id = Number(form.get('id'));
		let price: number | null = null;
		if (action === 'quote') {
			const money = readMoney(form, 'price');
			if ('error' in money) return fail(400, { error: money.error, id });
			price = money.value;
		}
		const result = await act(action, id, who!, locals, price);
		if ('error' in result) return fail(400, { error: result.error, id });
		return { done: action === 'quote' && result.order.status === 'taken' ? 'take' : action, id };
	};

export const actions: Actions = {
	take: change('take'),
	quote: change('quote'),
	accept: change('accept'),
	refuse: change('refuse'),
	release: change('release'),
	deliver: change('deliver'),
	cancel: change('cancel'),
	rate: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const rating = form.get('rating');
		if (rating !== 'up' && rating !== 'down') return fail(400, { error: 'Avis invalide.', id });
		const note = typeof form.get('note') === 'string' ? (form.get('note') as string) : null;
		const result = await rateOrder(id, { id: user.id, officer: user.permission === 'officer' }, rating, note);
		if ('error' in result) return fail(400, { error: result.error, id, rating });
		return { done: rating === 'up' ? 'rateUp' : 'rateDown', id };
	},
	alerts: async ({ locals, request }) => {
		const user = requireUser(locals);
		const on = (await request.formData()).get('craftAlerts') === 'on';
		db().update(schema.users).set({ craftAlerts: on }).where(eq(schema.users.discordId, user.id)).run();
		return { alerts: on };
	}
};
