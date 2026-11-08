import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { createCharacter } from './characters';
import { act, createOrder, EXPIRE_DAYS, listOrders, MAX_ACTIVE, openOrdersFor, recipeChoice } from './crafts';
import { db, schema } from './db';
import { craftSchema, setCrafts, setDiscord } from './settings';

horde();

const ROLE = '500000000000000001';
const REQUESTER = '100000000000000001';
const ARTISAN = '100000000000000002';
const OTHER = '100000000000000003';
const POTION = 2330;

createUser(REQUESTER, [ROLE]);
createUser(ARTISAN, [ROLE], { craftAlerts: true });
createUser(OTHER, [ROLE]);
const alchemist = createCharacter(ARTISAN, {
	name: 'Ysolde',
	surname: 'Test',
	race: 'orc',
	class: 'shaman',
	spec: 'restoration',
	role: 'healer',
	spec2: null,
	role2: null,
	level: 30,
	professions: [{ id: 'alchemy', level: 150 }],
	recipes: null,
	pve: null,
	pvp: null,
	notes: null,
	isMain: true
});
db()
	.update(schema.characters)
	.set({ knownRecipes: [{ profession: 'alchemy', skill: 150, recipes: [{ id: POTION, name: 'Potion de soins mineure', category: 'Potions' }] }] })
	.where(eq(schema.characters.id, alchemist.id))
	.run();

const order = (extra = {}) => createOrder(REQUESTER, { recipeId: POTION, quantity: 5, materials: true, comment: 'Pour jeudi', artisanId: null, ...extra });
const me = (id: string, officer = false) => ({ id, officer });

describe('commandes de craft', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('ne commande que les recettes connues dans la guilde', async () => {
		expect(recipeChoice(POTION)?.artisans.map((a) => a.playerId)).toEqual([ARTISAN]);
		expect(await order({ recipeId: 999 })).toHaveProperty('error');
		expect(await order({ artisanId: OTHER })).toEqual({ error: 'Cet artisan ne connaît pas la recette.' });
	});

	it('prise, rendue, puis livrée ; chacun seulement ce qui le concerne', async () => {
		const r = await order();
		if ('error' in r) throw new Error(r.error);
		expect(r.announced).toBe(false); // pas de salon configuré
		const id = r.order.id;
		expect(openOrdersFor(ARTISAN)).toBe(1);
		expect(openOrdersFor(OTHER)).toBe(0);

		expect(await act('take', id, me(REQUESTER))).toHaveProperty('error'); // pas sa propre commande
		expect(await act('take', id, me(ARTISAN))).toHaveProperty('order.takenBy', ARTISAN);
		expect(await act('take', id, me(OTHER))).toHaveProperty('error'); // déjà prise
		expect(openOrdersFor(ARTISAN)).toBe(0);
		expect(await act('release', id, me(OTHER))).toHaveProperty('error');
		expect(await act('release', id, me(ARTISAN))).toHaveProperty('order.status', 'open');
		await act('take', id, me(ARTISAN));
		expect(await act('cancel', id, me(OTHER))).toHaveProperty('error');
		expect(await act('deliver', id, me(REQUESTER))).toHaveProperty('order.status', 'delivered');
		expect(await act('cancel', id, me(REQUESTER))).toHaveProperty('error'); // déjà livrée

		const listed = (await listOrders()).find((o) => o.id === id)!;
		expect(listed).toMatchObject({ requester: `Joueur ${REQUESTER}`, taker: `Joueur ${ARTISAN}`, professionName: 'Alchimie' });
	});

	it(`${MAX_ACTIVE} commandes en cours au plus, et fermeture après ${EXPIRE_DAYS} jours sans preneur`, async () => {
		db().delete(schema.craftOrders).run();
		for (let i = 0; i < MAX_ACTIVE; i++) expect(await order()).toHaveProperty('order');
		expect(await order()).toHaveProperty('error');
		db()
			.update(schema.craftOrders)
			.set({ createdAt: new Date(Date.now() - (EXPIRE_DAYS + 1) * 86_400_000) })
			.run();
		const listed = await listOrders();
		expect(listed.every((o) => o.status === 'cancelled' && o.closedNote?.includes('14 jours'))).toBe(true);
		expect(await order()).toHaveProperty('order');
	});

	it('annonce sur Discord, mentionne les artisans qui le veulent, puis met le message à jour', async () => {
		db().delete(schema.craftOrders).run();
		setDiscord({ clientId: '111111111111111111', clientSecret: 'secret-secret-123', guildId: '222222222222222222', botToken: 'b' });
		setCrafts(craftSchema.parse({ channelId: '333333333333333333' }));
		const calls: { method: string; url: string; body: Record<string, unknown> }[] = [];
		vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
			calls.push({ method: init?.method ?? 'GET', url: url.replace('https://discord.com/api/v10', ''), body: JSON.parse(String(init?.body ?? '{}')) });
			return Response.json({ id: '444444444444444444' });
		});
		const r = await order();
		if ('error' in r) throw new Error(r.error);
		expect(r.announced).toBe(true);
		expect(calls[0]).toMatchObject({ method: 'POST', url: '/channels/333333333333333333/messages' });
		expect(calls[0].body.content).toBe(`Nouvelle commande pour <@${ARTISAN}>`);
		expect(calls[0].body.allowed_mentions).toEqual({ parse: ['roles'], users: [ARTISAN] });

		await act('take', r.order.id, me(ARTISAN));
		expect(calls[1]).toMatchObject({ method: 'PATCH', url: '/channels/333333333333333333/messages/444444444444444444' });
		const embed = (calls[1].body.embeds as { fields: { name: string; value: string }[] }[])[0];
		expect(embed.fields.find((f) => f.name === 'État')?.value).toBe(`Prise par Joueur ${ARTISAN}`);
		expect(calls[1].body.allowed_mentions).toEqual({ parse: [] });
	});
});
