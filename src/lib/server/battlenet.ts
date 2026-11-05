import { z } from 'zod';
import { audit } from './audit';
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

/** GET sur l'API ; null si la ressource n'existe pas (404), erreur sinon. */
async function get(s: BattlenetSettings, path: string, fetchFn: Fetch): Promise<unknown | null> {
	const url = `https://${s.region}.api.blizzard.com${path}?namespace=${NAMESPACE(s.region)}&locale=fr_FR`;
	const res = await fetchFn(url, { headers: { Authorization: `Bearer ${await accessToken(s, fetchFn)}` }, signal: AbortSignal.timeout(15_000) });
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
		const message = `${plan.rosterSize} membres en jeu, ${plan.updates.length} persos reconnus, ${changed} fiche${changed > 1 ? 's' : ''} mise${changed > 1 ? 's' : ''} à jour.`;
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
