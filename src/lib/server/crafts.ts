import { and, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { formatMoney } from '$lib/money';
import { recipeUrl } from '$lib/wowhead';
import { PROFESSIONS } from '$lib/game/forever';
import { artisansByProfession, type Artisan } from './artisans';
import { audit } from './audit';
import { BotError, botReady, editMessage, postMessage, type Embed } from './bot';
import { db, schema } from './db';
import type { CraftOrder, CraftStatus } from './db/schema';
import { getCrafts } from './settings';

// Commandes de craft. Un membre commande une recette qu'au moins un artisan de la guilde connaît ;
// un artisan la prend, puis la livre. Le bot annonce chaque commande dans le salon choisi et
// remplace son message à chaque changement d'état, pour que le salon reste une liste à jour.

/** Commandes ouvertes ou prises en même temps, par demandeur. */
export const MAX_ACTIVE = 5;
/** Une commande restée ouverte (personne ne l'a prise) est fermée au bout de ce délai. */
export const EXPIRE_DAYS = 14;
/** Les commandes livrées ou annulées restent affichées ce nombre de jours. */
export const KEEP_CLOSED_DAYS = 7;
const DAY = 86_400_000;

export const STATUS_LABELS: Record<CraftStatus, string> = { open: 'Ouverte', quoted: 'Prix proposé', taken: 'Prise', delivered: 'Livrée', cancelled: 'Annulée' };
const STATUS_COLORS: Record<CraftStatus, number> = { open: 0xd4a017, quoted: 0xe67e22, taken: 0x3b82f6, delivered: 0x22a55b, cancelled: 0x6b7280 };
const ACTIVE: CraftStatus[] = ['open', 'quoted', 'taken'];

type Actor = { id: string; officer: boolean };
export type CraftError = { error: string };

export interface RecipeChoice {
	id: number;
	name: string;
	profession: string;
	artisans: Artisan[];
}

/** La recette et les artisans de la guilde qui la connaissent (null si personne ne la connaît). */
export function recipeChoice(recipeId: number): RecipeChoice | null {
	for (const p of artisansByProfession()) {
		const artisans = p.artisans.filter((a) => a.recipes.some((r) => r.id === recipeId));
		if (artisans.length) return { id: recipeId, name: artisans[0].recipes.find((r) => r.id === recipeId)!.name, profession: p.id, artisans };
	}
	return null;
}

const professionName = (id: string) => PROFESSIONS.find((p) => p.id === id)?.name ?? id;

/** Ferme les commandes restées ouvertes trop longtemps (appelé à chaque lecture de la liste). */
export async function expireOld(now = new Date()) {
	const limit = new Date(now.getTime() - EXPIRE_DAYS * DAY);
	const stale = db()
		.update(schema.craftOrders)
		.set({ status: 'cancelled', closedNote: `Personne ne l’a prise en ${EXPIRE_DAYS} jours.`, closedAt: now, updatedAt: now })
		.where(and(inArray(schema.craftOrders.status, ['open', 'quoted']), lt(schema.craftOrders.createdAt, limit)))
		.returning()
		.all();
	for (const o of stale) await refreshAnnouncement(o);
}

export interface NewOrder {
	recipeId: number;
	quantity: number;
	materials: boolean;
	comment: string | null;
	artisanId: string | null;
	/** Composants fournis : commission offerte (pc). Composants à trouver : budget maximum (pc). */
	commission: number | null;
	budget: number | null;
}

export async function createOrder(requesterId: string, input: NewOrder): Promise<CraftError | { order: CraftOrder; announced: boolean }> {
	const recipe = recipeChoice(input.recipeId);
	if (!recipe) return { error: 'Personne dans la guilde ne connaît cette recette (ou elle n’a pas encore été exportée).' };
	if (input.artisanId && !recipe.artisans.some((a) => a.playerId === input.artisanId)) return { error: 'Cet artisan ne connaît pas la recette.' };
	const active = db()
		.select({ n: sql<number>`count(*)` })
		.from(schema.craftOrders)
		.where(and(eq(schema.craftOrders.requesterId, requesterId), inArray(schema.craftOrders.status, ACTIVE)))
		.get()!.n;
	if (active >= MAX_ACTIVE) return { error: `Tu as déjà ${MAX_ACTIVE} commandes en cours : attends qu’une soit livrée, ou annule-en une.` };

	const order = db()
		.insert(schema.craftOrders)
		.values({
			requesterId,
			profession: recipe.profession,
			recipeId: recipe.id,
			recipeName: recipe.name,
			quantity: input.quantity,
			materials: input.materials,
			comment: input.comment,
			artisanId: input.artisanId,
			// Une commission n'a de sens qu'avec les composants fournis, un budget que sans.
			commission: input.materials ? input.commission : null,
			budget: input.materials ? null : input.budget
		})
		.returning()
		.get();
	return { order, announced: await announce(order, recipe) };
}

function getOrder(id: number) {
	return db().select().from(schema.craftOrders).where(eq(schema.craftOrders.id, id)).get() ?? null;
}

// Changements d'état autorisés : qui peut faire quoi, depuis quel état. Composants fournis :
// l'artisan prend la commande. Composants à trouver : il propose un prix ; dans le budget, la
// commande est prise aussitôt, sinon le demandeur l'accepte ou la refuse.
const TRANSITIONS = {
	take: { from: ['open'], allowed: (o: CraftOrder, a: Actor) => o.materials && o.requesterId !== a.id },
	quote: { from: ['open'], allowed: (o: CraftOrder, a: Actor) => !o.materials && o.requesterId !== a.id },
	accept: { from: ['quoted'], allowed: (o: CraftOrder, a: Actor) => o.requesterId === a.id },
	refuse: { from: ['quoted'], allowed: (o: CraftOrder, a: Actor) => o.requesterId === a.id },
	// Le demandeur, lui, refuse le prix (« refuse ») : « release » est pour l'artisan, ou un officier.
	release: { from: ['quoted', 'taken'], allowed: (o: CraftOrder, a: Actor) => (o.status === 'taken' ? o.takenBy : o.quotedBy) === a.id || (a.officer && o.requesterId !== a.id) },
	deliver: { from: ['taken'], allowed: (o: CraftOrder, a: Actor) => o.takenBy === a.id || o.requesterId === a.id || a.officer },
	cancel: { from: ['open', 'quoted', 'taken'], allowed: (o: CraftOrder, a: Actor) => o.requesterId === a.id || a.officer }
} satisfies Record<string, { from: CraftStatus[]; allowed: (o: CraftOrder, a: Actor) => boolean }>;
export type CraftAction = keyof typeof TRANSITIONS;

export function canDo(action: CraftAction, order: CraftOrder, actor: Actor) {
	const t = TRANSITIONS[action];
	return (t.from as CraftStatus[]).includes(order.status) && t.allowed(order, actor);
}

function nextValues(action: CraftAction, order: CraftOrder, actor: Actor, price: number | null, now: Date): Partial<CraftOrder> {
	switch (action) {
		case 'take':
			return { status: 'taken', takenBy: actor.id };
		case 'quote':
			return price !== null && order.budget !== null && price <= order.budget
				? { status: 'taken', takenBy: actor.id, price, quotedBy: null }
				: { status: 'quoted', quotedBy: actor.id, price };
		case 'accept':
			return { status: 'taken', takenBy: order.quotedBy, quotedBy: null };
		case 'refuse':
		case 'release':
			// Composants à trouver : le prix tombe avec l'artisan qui l'avait proposé.
			return { status: 'open', takenBy: null, quotedBy: null, price: null };
		case 'deliver':
			return { status: 'delivered', closedAt: now };
		case 'cancel':
			return { status: 'cancelled', closedAt: now, closedNote: order.requesterId === actor.id ? null : 'Fermée par un officier.' };
	}
}

/**
 * Change l'état d'une commande. `price` : prix proposé (pc) pour « quote ». `locals` sert au
 * journal quand un officier ferme la commande d'un autre membre.
 */
export async function act(action: CraftAction, orderId: number, actor: Actor, locals: App.Locals | null = null, price: number | null = null): Promise<CraftError | { order: CraftOrder }> {
	const order = getOrder(orderId);
	if (!order) return { error: 'Cette commande n’existe plus.' };
	if (!canDo(action, order, actor)) return { error: 'Cette commande a changé entre-temps, ou ce n’est pas à toi de le faire.' };
	if (action === 'quote' && !price) return { error: 'Indique ton prix (composants et commission compris).' };
	if (action === 'accept' && !order.quotedBy) return { error: 'L’artisan qui avait proposé ce prix n’est plus là.' };
	const now = new Date();
	// L'état est revérifié dans la requête : deux artisans qui cliquent en même temps ne la prennent pas tous les deux.
	const updated = db()
		.update(schema.craftOrders)
		.set({ ...nextValues(action, order, actor, price, now), updatedAt: now })
		.where(and(eq(schema.craftOrders.id, orderId), eq(schema.craftOrders.status, order.status)))
		.returning()
		.get();
	if (!updated) return { error: 'Cette commande a changé entre-temps : recharge la page.' };
	if (action === 'cancel' && order.requesterId !== actor.id && locals) audit(locals, 'craft.close', { label: `${order.quantity} × ${order.recipeName}`, url: '/commandes' });
	await refreshAnnouncement(updated);
	// Un prix attend sa réponse : le demandeur est mentionné, sous l'annonce.
	if (updated.status === 'quoted') await notifyQuote(updated);
	return { order: updated };
}

// ── Liste ─────────────────────────────────────────────────────────────────────

export async function listOrders(now = new Date()) {
	await expireOld(now);
	const since = new Date(now.getTime() - KEEP_CLOSED_DAYS * DAY);
	const orders = db()
		.select()
		.from(schema.craftOrders)
		.where(or(inArray(schema.craftOrders.status, ACTIVE), gte(schema.craftOrders.closedAt, since)))
		.orderBy(desc(schema.craftOrders.createdAt))
		.all();
	const ids = [...new Set(orders.flatMap((o) => [o.requesterId, o.takenBy, o.artisanId, o.quotedBy]).filter((id): id is string => Boolean(id)))];
	const names = new Map(
		ids.length
			? db()
					.select({ id: schema.users.discordId, name: schema.users.displayName })
					.from(schema.users)
					.where(inArray(schema.users.discordId, ids))
					.all()
					.map((u) => [u.id, u.name])
			: []
	);
	const knowers = new Map<number, Artisan[]>();
	for (const p of artisansByProfession())
		for (const a of p.artisans)
			for (const r of a.recipes) if (orders.some((o) => o.recipeId === r.id)) knowers.set(r.id, [...(knowers.get(r.id) ?? []), a]);
	return orders.map((o) => ({
		...o,
		professionName: professionName(o.profession),
		requester: names.get(o.requesterId) ?? 'Ancien membre',
		taker: o.takenBy ? (names.get(o.takenBy) ?? 'Ancien membre') : null,
		artisan: o.artisanId ? (names.get(o.artisanId) ?? null) : null,
		quoter: o.quotedBy ? (names.get(o.quotedBy) ?? 'Ancien membre') : null,
		artisans: (knowers.get(o.recipeId) ?? []).map((a) => ({ playerId: a.playerId, name: a.name, player: a.player }))
	}));
}

/**
 * Compteur du menu : commandes ouvertes d'une recette que le joueur connaît, plus ses propres
 * commandes dont un prix attend sa réponse.
 */
export function openOrdersFor(userId: string) {
	const rows = db()
		.select({ recipeId: schema.craftOrders.recipeId, requesterId: schema.craftOrders.requesterId, status: schema.craftOrders.status })
		.from(schema.craftOrders)
		.where(inArray(schema.craftOrders.status, ['open', 'quoted']))
		.all();
	const toAnswer = rows.filter((o) => o.status === 'quoted' && o.requesterId === userId).length;
	const open = rows.filter((o) => o.status === 'open');
	if (!open.length) return toAnswer;
	const known = new Set(
		db()
			.select({ known: schema.characters.knownRecipes })
			.from(schema.characters)
			.where(eq(schema.characters.userId, userId))
			.all()
			.flatMap((c) => (c.known ?? []).flatMap((k) => k.recipes.map((r) => r.id)))
	);
	return toAnswer + open.filter((o) => o.requesterId !== userId && known.has(o.recipeId)).length;
}

// ── Discord ───────────────────────────────────────────────────────────────────

function embed(order: CraftOrder, people: { requester: string; taker: string | null; artisan: string | null; quoter: string | null; artisans: string[] }): Embed {
	const state =
		order.status === 'taken' && people.taker
			? `Prise par ${people.taker}${order.price ? ` pour ${formatMoney(order.price)}` : ''}`
			: order.status === 'quoted' && people.quoter
				? `${people.quoter} propose ${formatMoney(order.price)} : en attente du demandeur`
			: order.status === 'cancelled' && order.closedNote
				? `Annulée : ${order.closedNote}`
				: STATUS_LABELS[order.status];
	const done = order.status === 'delivered' || order.status === 'cancelled';
	return {
		title: `${done ? '~~' : ''}${order.quantity} × ${order.recipeName}${done ? '~~' : ''}`,
		url: `${env.ORIGIN ?? ''}/commandes#commande-${order.id}`,
		color: STATUS_COLORS[order.status],
		description: [order.comment ? `« ${order.comment} »` : null, `[Voir la recette sur Wowhead](${recipeUrl(order.recipeId)})`].filter(Boolean).join('\n'),
		fields: [
			{ name: 'État', value: state, inline: true },
			{ name: 'Demandée par', value: people.requester, inline: true },
			{ name: 'Composants', value: order.materials ? 'Fournis par le demandeur' : 'À trouver par l’artisan', inline: true },
			...(order.commission ? [{ name: 'Commission offerte', value: formatMoney(order.commission), inline: true }] : []),
			...(order.budget && order.status === 'open' ? [{ name: 'Budget maximum', value: formatMoney(order.budget), inline: true }] : []),
			...(people.artisan ? [{ name: 'Artisan souhaité', value: people.artisan, inline: true }] : []),
			...(!done && people.artisans.length ? [{ name: `${professionName(order.profession)} : la connaissent`, value: people.artisans.slice(0, 15).join(', ') }] : [])
		]
	};
}

function peopleOf(order: CraftOrder) {
	const ids = [order.requesterId, order.takenBy, order.artisanId, order.quotedBy].filter((id): id is string => Boolean(id));
	const names = new Map(
		db()
			.select({ id: schema.users.discordId, name: schema.users.displayName })
			.from(schema.users)
			.where(inArray(schema.users.discordId, ids))
			.all()
			.map((u) => [u.id, u.name])
	);
	return {
		requester: names.get(order.requesterId) ?? 'Ancien membre',
		taker: order.takenBy ? (names.get(order.takenBy) ?? null) : null,
		artisan: order.artisanId ? (names.get(order.artisanId) ?? null) : null,
		quoter: order.quotedBy ? (names.get(order.quotedBy) ?? null) : null
	};
}

/** Annonce une nouvelle commande ; mentionne les artisans qui l'ont demandé et connaissent la recette. */
async function announce(order: CraftOrder, recipe: RecipeChoice) {
	const { channelId } = getCrafts();
	if (!botReady() || !channelId) return false;
	const artisanIds = [...new Set(recipe.artisans.map((a) => a.playerId))].filter((id) => id !== order.requesterId);
	const wantAlerts = new Set(
		artisanIds.length
			? db()
					.select({ id: schema.users.discordId })
					.from(schema.users)
					.where(and(inArray(schema.users.discordId, artisanIds), eq(schema.users.craftAlerts, true)))
					.all()
					.map((u) => u.id)
			: []
	);
	// L'artisan souhaité est prévenu s'il l'a demandé, comme les autres.
	const mention = artisanIds.filter((id) => wantAlerts.has(id));
	try {
		const messageId = await postMessage(
			channelId,
			{
				content: mention.length ? `Nouvelle commande pour ${mention.map((id) => `<@${id}>`).join(' ')}` : undefined,
				embeds: [embed(order, { ...peopleOf(order), artisans: recipe.artisans.map((a) => a.name) })]
			},
			mention
		);
		db().update(schema.craftOrders).set({ discordChannelId: channelId, discordMessageId: messageId }).where(eq(schema.craftOrders.id, order.id)).run();
		return true;
	} catch (e) {
		console.error('Annonce de la commande impossible :', e instanceof BotError || e instanceof Error ? e.message : e);
		return false;
	}
}

/** Met le message Discord de la commande à jour (état, artisan qui l'a prise…). */
async function refreshAnnouncement(order: CraftOrder) {
	if (!order.discordChannelId || !order.discordMessageId || !botReady()) return;
	const artisans = recipeChoice(order.recipeId)?.artisans.map((a) => a.name) ?? [];
	try {
		await editMessage(order.discordChannelId, order.discordMessageId, { embeds: [embed(order, { ...peopleOf(order), artisans })] });
	} catch (e) {
		console.error('Mise à jour de l’annonce de commande impossible :', e instanceof Error ? e.message : e);
	}
}

/** Réponse sous l'annonce : le demandeur est mentionné pour accepter ou refuser le prix proposé. */
async function notifyQuote(order: CraftOrder) {
	if (!order.discordChannelId || !order.discordMessageId || !botReady()) return;
	const { quoter } = peopleOf(order);
	try {
		await postMessage(
			order.discordChannelId,
			{
				content: `<@${order.requesterId}> ${quoter ?? 'Un artisan'} propose ${formatMoney(order.price)} pour ${order.quantity} × ${order.recipeName} (composants compris). Accepte ou refuse sur ${env.ORIGIN ?? ''}/commandes#commande-${order.id}`,
				replyTo: order.discordMessageId
			},
			[order.requesterId]
		);
	} catch (e) {
		console.error('Message de prix proposé impossible :', e instanceof Error ? e.message : e);
	}
}
