import { asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { characterSlug } from '$lib/armory';
import { PROFESSIONS } from '$lib/game/forever';
import { audit } from './audit';
import { detectDepartures } from './departures';
import { db, schema } from './db';
import type { ArmoryStatus, ProfessionEntry } from './db/schema';
import { applyImport, nameKey, planImport, type GameExport } from './game-import';
import { getBattlenet, getGameRanks, setBattlenetStatus, type BattlenetSettings } from './settings';

// Synchronisation par l'API officielle de Blizzard (Battle.net) : registre de la guilde avec les
// noms complets, niveaux, métiers et dernière connexion de chaque perso, sans addon. Les données
// passent par le même plan que l'import de l'addon (planImport), avec des métiers complets.
// L'API ne donne pas les recettes avec les numéros de Wowhead : elles restent l'affaire de l'addon.
//
// Forever : espace de noms `profile-forever-<région>`, persos sans royaume (`/character/prenom-nom`).

type Fetch = typeof fetch;

const NAMESPACE = (region: string) => `profile-forever-${region}`;
// Toutes les 3 heures ; l'Armurerie se met à jour à la déconnexion des persos.
export const SYNC_EVERY_MS = 3 * 3_600_000;
const PARALLEL = 6;

export class BattlenetError extends Error {}

// Classes de l'API (playable_class.id) → identifiants du jeu, comme dans l'export de l'addon.
const CLASS_FILES: Record<number, string> = { 1: 'WARRIOR', 2: 'PALADIN', 3: 'HUNTER', 4: 'ROGUE', 5: 'PRIEST', 7: 'SHAMAN', 8: 'MAGE', 9: 'WARLOCK', 11: 'DRUID' };

const rosterSchema = z.object({
	members: z.array(
		z.object({
			character: z.object({
				name: z.string(),
				surname: z.string().nullish(),
				slug: z.string().nullish(),
				level: z.number().int(),
				playable_class: z.object({ id: z.number().int() }).nullish()
			}),
			rank: z.number().int().nullish()
		})
	)
});
const profileSchema = z.object({ last_login_timestamp: z.number().nullish() });
const characterSchema = z.object({
	name: z.string(),
	surname: z.string().nullish(),
	level: z.number().int(),
	character_class: z.object({ id: z.number().int() }).nullish(),
	race: z.object({ id: z.number().int() }).nullish(),
	guild: z.object({ name: z.string() }).nullish(),
	last_login_timestamp: z.number().nullish()
});
// Races de l'API (playable_race.id) → identifiants du site.
const RACE_IDS: Record<number, string> = {
	1: 'human',
	2: 'orc',
	3: 'dwarf',
	4: 'night-elf',
	5: 'undead',
	6: 'tauren',
	7: 'gnome',
	8: 'troll',
	// Skyborne (Éolides), propres à Forever.
	95: 'skyborne-alliance',
	96: 'skyborne-horde'
};
const tierSchema = z.object({ skill_points: z.number().int().nullish() });
const professionsSchema = z.object({
	primaries: z.array(z.object({ profession: z.object({ id: z.number().int(), name: z.string().nullish() }), tiers: z.array(tierSchema).default([]) })).default([]),
	secondaries: z.array(z.object({ profession: z.object({ id: z.number().int(), name: z.string().nullish() }), tiers: z.array(tierSchema).default([]) })).default([])
});

export const isConfigured = (s: BattlenetSettings = getBattlenet()) => Boolean(s.clientId && s.clientSecret && s.guildSlug);

// Jeton d'application (24 h), gardé en mémoire et redemandé une minute avant la fin.
let token: { key: string; value: string; expires: number } | null = null;

async function accessToken(s: BattlenetSettings, fetchFn: Fetch) {
	const key = `${s.clientId}:${s.clientSecret}`;
	if (token?.key === key && token.expires > Date.now() + 60_000) return token.value;
	const res = await fetchFn('https://oauth.battle.net/token', {
		method: 'POST',
		headers: { Authorization: `Basic ${Buffer.from(key).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: 'grant_type=client_credentials',
		signal: AbortSignal.timeout(10_000)
	});
	if (res.status === 401 || res.status === 400) throw new BattlenetError('Battle.net refuse le Client ID ou la clé secrète : vérifie-les sur develop.battle.net.');
	if (!res.ok) throw new BattlenetError(`Battle.net ne répond pas (connexion : erreur ${res.status}).`);
	const body = (await res.json()) as { access_token?: string; expires_in?: number };
	if (!body.access_token) throw new BattlenetError('Battle.net n’a pas donné de jeton d’accès.');
	token = { key, value: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
	return token.value;
}

/**
 * GET sur l'API ; null si la ressource n'existe pas (404), erreur sinon. Espaces de noms :
 * `profile` (persos, guilde), `dynamic` (hôtels des ventes), `static` (objets du jeu).
 */
async function get(s: BattlenetSettings, path: string, fetchFn: Fetch, kind: 'profile' | 'dynamic' | 'static' = 'profile'): Promise<unknown | null> {
	const dynamic = kind === 'dynamic';
	const namespace = kind === 'profile' ? NAMESPACE(s.region) : `${kind}-forever-${s.region}`;
	const url = `https://${s.region}.api.blizzard.com${path}?namespace=${namespace}&locale=fr_FR`;
	// Un hôtel des ventes pèse plusieurs Mo : plus de temps.
	const res = await fetchFn(url, { headers: { Authorization: `Bearer ${await accessToken(s, fetchFn)}` }, signal: AbortSignal.timeout(dynamic ? 60_000 : 15_000) });
	if (res.status === 404) return null;
	if (!res.ok) throw new BattlenetError(`Battle.net : erreur ${res.status} sur ${path.split('/').slice(0, 5).join('/')}.`);
	return res.json();
}

const slugOf = (m: { name: string; surname?: string | null; slug?: string | null }) =>
	m.slug ?? [m.name, m.surname].filter(Boolean).join('-').toLocaleLowerCase('fr').replace(/\s+/g, '-');

/** Export équivalent à celui de l'addon, construit avec l'API, et noms dont les métiers sont complets. */
export async function buildExport(s: BattlenetSettings, fetchFn: Fetch = fetch, now = Date.now()) {
	const raw = await get(s, `/data/wow/guild/${encodeURIComponent(s.guildSlug)}/roster`, fetchFn);
	if (raw === null) throw new BattlenetError(`Guilde « ${s.guildSlug} » introuvable sur Battle.net (${s.region.toUpperCase()}) : vérifie son nom dans l'adresse de l'Armurerie.`);
	const parsed = rosterSchema.safeParse(raw);
	if (!parsed.success) throw new BattlenetError('Registre de guilde inattendu dans la réponse de Battle.net.');
	const ranks = getGameRanks();
	const members = parsed.data.members.map(({ character: c, rank }) => ({
		name: [c.name, c.surname].filter(Boolean).join(' '),
		slug: slugOf(c),
		level: Math.min(Math.max(c.level, 1), 100),
		class: c.playable_class ? (CLASS_FILES[c.playable_class.id] ?? null) : null,
		rank: rank == null ? null : (ranks[String(rank)] ?? (rank === 0 ? 'Chef de guilde' : `Rang ${rank}`))
	}));

	// Fiche et métiers de chaque membre (deux appels par perso, quelques-uns à la fois).
	// Dans l'ordre du registre, quel que soit l'ordre des réponses.
	const roster: NonNullable<GameExport['roster']> = new Array(members.length);
	const byProfession = new Map<number, { skillLine: number; name: string | null; members: { name: string; skill: number | null }[] }>();
	const complete: string[] = [];
	const dataAt: Record<string, number> = {};
	for (let i = 0; i < members.length; i += PARALLEL) {
		await Promise.all(
			members.slice(i, i + PARALLEL).map(async (m, n) => {
				const base = `/profile/wow/character/${encodeURIComponent(m.slug)}`;
				const [profile, professions] = await Promise.all([get(s, base, fetchFn).catch(() => null), get(s, `${base}/professions`, fetchFn).catch(() => null)]);
				const last = profileSchema.safeParse(profile ?? {}).data?.last_login_timestamp;
				dataAt[nameKey(m.name)] = last ?? 0;
				const hours = last ? Math.min(Math.max(0, Math.floor((now - last) / 3_600_000)), 10_000) : null;
				roster[i + n] = { name: m.name, level: m.level, class: m.class, rank: m.rank, ...(hours !== null && { offline: { hours } }) };
				// Métiers inconnus (404, erreur) : on ne touche pas à ceux de la fiche.
				if (!professions) return;
				const p = professionsSchema.safeParse(professions ?? {});
				if (!p.success) return;
				for (const e of [...p.data.primaries, ...p.data.secondaries]) {
					const group = byProfession.get(e.profession.id) ?? { skillLine: e.profession.id, name: e.profession.name ?? null, members: [] };
					group.members.push({ name: m.name, skill: Math.max(0, ...e.tiers.map((t) => t.skill_points ?? 0)) || null });
					byProfession.set(e.profession.id, group);
				}
				complete.push(m.name);
			})
		);
	}
	const data: GameExport = { format: 1, exportedAt: Math.floor(now / 1000), roster, guildProfessions: [...byProfession.values()] };
	return { data, complete, dataAt };
}

let running: Promise<{ ok: boolean; message: string }> | null = null;

/** Synchronise la guilde ; un seul passage à la fois. `by` : qui l'a demandé (null = automatique). */
export function syncBattlenet(by: App.Locals | null = null, fetchFn: Fetch = fetch) {
	running ??= run(by, fetchFn).finally(() => (running = null));
	return running;
}

async function run(by: App.Locals | null, fetchFn: Fetch) {
	const s = getBattlenet();
	if (!isConfigured(s)) return { ok: false, message: 'Battle.net n’est pas configuré.' };
	try {
		const { data, complete, dataAt } = await buildExport(s, fetchFn);
		const plan = planImport(data, { completeProfessions: complete, dataAt });
		const changed = applyImport(plan, { by: 'Battle.net', via: 'battlenet' });
		await markVerified(data.roster ?? [], plan.updates, fetchFn);
		const departures = await detectDepartures(new Set(plan.updates.map((u) => u.characterId)), plan.rosterSize, (name, surname) => lookupCharacter(name, surname, fetchFn));
		const message = [
			`${plan.rosterSize} membres en jeu, ${plan.updates.length} persos reconnus, ${changed} fiche${changed > 1 ? 's' : ''} mise${changed > 1 ? 's' : ''} à jour.`,
			departures.left.length ? `Départ de la guilde : ${departures.left.join(', ')}.` : '',
			departures.returned.length ? `De retour : ${departures.returned.join(', ')}.` : ''
		]
			.filter(Boolean)
			.join(' ');
		setBattlenetStatus({ at: Date.now(), ok: true, message });
		if (by || changed) {
			const locals = by ?? ({ user: null, candidate: null, admin: null } as unknown as App.Locals);
			audit(locals, 'game.battlenet', { label: 'Battle.net', url: '/admin/import' }, { persos: changed, reconnus: plan.updates.length, membres: plan.rosterSize });
		}
		return { ok: true, message };
	} catch (e) {
		const message = e instanceof BattlenetError ? e.message : `Battle.net injoignable (${e instanceof Error ? e.message : e}).`;
		setBattlenetStatus({ at: Date.now(), ok: false, message });
		return { ok: false, message };
	}
}

/** Au démarrage : une synchronisation après une minute, puis toutes les 3 heures (si configuré). */
export function startBattlenetSchedule() {
	if (process.env.VITEST) return;
	const tick = () => {
		if (isConfigured()) syncBattlenet().catch((e) => console.warn('Battle.net :', e));
	};
	setTimeout(tick, 60_000).unref();
	setInterval(tick, SYNC_EVERY_MS).unref();
}

/** Pour les tests : oublie le jeton en mémoire. */
export const resetBattlenetToken = () => (token = null);

// ---------------------------------------------------------------------------------------------
// Vérification d'un perso dans l'Armurerie : à la saisie (formulaire), à l'enregistrement, et à
// chaque synchronisation pour ceux qui ne sont pas encore vérifiés. L'Armurerie ne connaît que
// les persos déconnectés depuis son ouverture : « introuvable » n'est donc pas une preuve.

export type ArmoryLookup =
	| { status: 'found'; name: string; surname: string | null; level: number; classId: string | null; raceId: string | null; guild: string | null; professions: ProfessionEntry[] }
	| { status: 'missing' }
	| { status: 'unavailable' };

const LOOKUP_TTL_MS = 10 * 60_000;
const lookups = new Map<string, { at: number; result: ArmoryLookup }>();

const professionsOf = (raw: unknown): ProfessionEntry[] => {
	const p = professionsSchema.safeParse(raw ?? {});
	if (!p.success) return [];
	return [...p.data.primaries, ...p.data.secondaries].flatMap((e) => {
		const known = PROFESSIONS.find((x) => x.skillLine === e.profession.id);
		const level = Math.max(0, ...e.tiers.map((t) => t.skill_points ?? 0));
		return known ? [{ id: known.id, level: level || null }] : [];
	});
};

/** Cherche un perso dans l'Armurerie (résultat gardé 10 minutes). */
export async function lookupCharacter(name: string, surname: string | null | undefined, fetchFn: Fetch = fetch): Promise<ArmoryLookup> {
	const s = getBattlenet();
	const slug = characterSlug(name, surname);
	if (!isConfigured(s) || slug.length < 3) return { status: 'unavailable' };
	const cached = lookups.get(slug);
	if (cached && Date.now() - cached.at < LOOKUP_TTL_MS) return cached.result;
	let result: ArmoryLookup;
	try {
		const base = `/profile/wow/character/${encodeURIComponent(slug)}`;
		const raw = await get(s, base, fetchFn);
		const c = raw === null ? null : characterSchema.safeParse(raw);
		if (raw === null) result = { status: 'missing' };
		else if (!c?.success) result = { status: 'unavailable' };
		else {
			const professions = professionsOf(await get(s, `${base}/professions`, fetchFn).catch(() => null));
			result = {
				status: 'found',
				name: c.data.name,
				surname: c.data.surname ?? null,
				level: c.data.level,
				classId: c.data.character_class ? (CLASS_FILES[c.data.character_class.id]?.toLowerCase() ?? null) : null,
				raceId: c.data.race ? (RACE_IDS[c.data.race.id] ?? null) : null,
				guild: c.data.guild?.name ?? null,
				professions
			};
		}
	} catch {
		return { status: 'unavailable' };
	}
	if (lookups.size > 500) lookups.clear();
	lookups.set(slug, { at: Date.now(), result });
	return result;
}

/** Statut d'une fiche d'après l'Armurerie ; null si Battle.net n'a pas répondu (rien à changer). */
export function armoryStatusFor(sheetClass: string, lookup: ArmoryLookup): ArmoryStatus | null {
	if (lookup.status === 'unavailable') return null;
	if (lookup.status === 'missing') return 'missing';
	return !lookup.classId || lookup.classId === sheetClass ? 'found' : 'mismatch';
}

function setArmoryStatus(characterId: number, status: ArmoryStatus) {
	db().update(schema.characters).set({ armoryStatus: status, armoryCheckedAt: new Date() }).where(eq(schema.characters.id, characterId)).run();
}

/** Vérifie une fiche tout de suite (après son enregistrement). */
export async function verifyCharacter(characterId: number, fetchFn: Fetch = fetch) {
	const c = db().select().from(schema.characters).where(eq(schema.characters.id, characterId)).get();
	if (!c || !isConfigured()) return null;
	const status = armoryStatusFor(c.class, await lookupCharacter(c.name, c.surname, fetchFn));
	if (status) setArmoryStatus(c.id, status);
	return status;
}

const PENDING_PER_PASS = 40;

/** Fiches pas encore vérifiées (ou introuvables) : revues à chaque synchronisation, 40 au plus. */
async function verifyPending(skip: Set<number>, fetchFn: Fetch) {
	const pending = db()
		.select({ id: schema.characters.id, name: schema.characters.name, surname: schema.characters.surname, class: schema.characters.class })
		.from(schema.characters)
		.where(or(isNull(schema.characters.armoryStatus), ne(schema.characters.armoryStatus, 'found')))
		.orderBy(asc(schema.characters.armoryCheckedAt))
		.all()
		.filter((c) => !skip.has(c.id))
		.slice(0, PENDING_PER_PASS);
	for (let i = 0; i < pending.length; i += PARALLEL) {
		await Promise.all(
			pending.slice(i, i + PARALLEL).map(async (c) => {
				const status = armoryStatusFor(c.class, await lookupCharacter(c.name, c.surname, fetchFn));
				if (status) setArmoryStatus(c.id, status);
			})
		);
	}
}

/** Après une synchronisation : les persos du registre existent en jeu, avec la classe du registre. */
async function markVerified(roster: NonNullable<GameExport['roster']>, updates: { characterId: number; gameName?: string }[], fetchFn: Fetch) {
	const classes = new Map(roster.map((m) => [nameKey(m.name), m.class?.toLowerCase() ?? null]));
	const ids = updates.map((u) => u.characterId);
	const sheets = ids.length ? db().select({ id: schema.characters.id, class: schema.characters.class }).from(schema.characters).where(inArray(schema.characters.id, ids)).all() : [];
	for (const u of updates) {
		const sheet = sheets.find((x) => x.id === u.characterId);
		const cls = u.gameName ? classes.get(nameKey(u.gameName)) : undefined;
		if (sheet && cls !== undefined) setArmoryStatus(sheet.id, !cls || cls === sheet.class ? 'found' : 'mismatch');
	}
	await verifyPending(new Set(ids), fetchFn);
}

/** Pour les tests : oublie les recherches en mémoire. */
export const resetArmoryCache = () => lookups.clear();

/** Données « dynamiques » (hôtels des ventes) ou « statiques » (objets) de Forever, avec la connexion Battle.net de la guilde. */
export function getDynamic(path: string, fetchFn: Fetch = fetch, kind: 'dynamic' | 'static' = 'dynamic') {
	const s = getBattlenet();
	if (!s.clientId || !s.clientSecret) throw new BattlenetError('Battle.net n’est pas connecté (Admin → Import du jeu).');
	return get(s, path, fetchFn, kind);
}
