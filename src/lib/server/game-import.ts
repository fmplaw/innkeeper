import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { CLASSES, MAX_PRIMARY_PROFESSIONS, MAX_PROFESSION_LEVEL, PROFESSIONS } from '$lib/game/forever';
import { db, schema } from './db';
import type { Character, KnownRecipes, ProfessionEntry } from './db/schema';
import { parseSavedVariables, toPlain } from './lua-saved-variables';
import { isFrench, learnFrenchNames, scheduleTranslation, translateRecipes } from './recipe-names';
import { getGameImport, getGameRoster, setGameImport, setGameRoster, type GameRosterInfo } from './settings';

// Import de l'export de l'addon InnkeeperSync : met à jour niveau, métiers, dernière
// connexion en jeu et recettes des fiches du site, en reliant les persos par leur nom
// (Forever n'a pas de royaumes).

const name = z.string().trim().min(1).max(40);
const count = z.number().int().min(0).max(10_000);

const exportSchema = z.object({
	format: z.number().int(),
	exportedAt: z.number().int().positive(),
	locale: z.string().max(10).nullish(),
	player: z.object({ name, level: z.number().int().optional(), class: z.string().nullish(), guild: z.string().nullish() }).optional(),
	roster: z
		.array(
			z.object({
				name,
				level: z.number().int().min(1).max(100),
				class: z.string().nullish(),
				rank: z.string().nullish(),
				online: z.boolean().optional(),
				offline: z.object({ years: count, months: count, days: count, hours: count }).partial().optional()
			})
		)
		.optional(),
	guildProfessions: z
		.array(
			z.object({
				skillLine: z.number().int().nullish(),
				name: z.string().nullish(),
				members: z.array(z.object({ name, skill: z.number().int().nullish() })).default([])
			})
		)
		.optional(),
	professions: z.array(z.object({ skillLine: z.number().int().nullish(), name: z.string().nullish(), skill: z.number().int().nullish() })).optional(),
	recipes: z
		.record(
			z.string(),
			z.object({
				skillLine: z.number().int().nullish(),
				name: z.string().nullish(),
				skill: z.number().int().nullish(),
				list: z.array(z.object({ id: z.number().int(), name: z.string() })).default([])
			})
		)
		.optional()
});
export type GameExport = z.output<typeof exportSchema>;

export class ImportError extends Error {}

/** Lit le fichier InnkeeperSync.lua déposé. */
export function readExport(source: string): GameExport {
	let globals;
	try {
		globals = parseSavedVariables(source);
	} catch (e) {
		throw new ImportError(`Fichier illisible : ${e instanceof Error ? e.message : e}`);
	}
	// GuildSiteSyncDB : ancien nom de l'addon (avant Innkeeper), encore accepté.
	const db = globals.InnkeeperSyncDB ?? globals.GuildSiteSyncDB;
	if (!db) throw new ImportError('Ce fichier ne vient pas de l’addon InnkeeperSync (InnkeeperSync.lua attendu).');
	const raw = toPlain(db);
	// Une table vide (`{}`) se lit comme une liste vide : rien n'a été exporté.
	if (Array.isArray(raw)) throw new ImportError('L’export est vide : connecte-toi en jeu, tape /innkeeper puis /reload avant de déposer le fichier.');
	const parsed = exportSchema.safeParse(raw);
	if (!parsed.success) throw new ImportError(`Export inattendu : ${parsed.error.issues[0].path.join('.')} ${parsed.error.issues[0].message}`);
	return parsed.data;
}

/** Nom de perso comparable : sans royaume, en minuscules, forme Unicode stable. */
export const nameKey = (n: string) => n.replace(/-.*$/, '').normalize('NFC').toLocaleLowerCase('fr');

// Le registre de guilde de Forever donne le nom complet, « Prénom Nom » (seul ce couple est unique) ;
// le perso qui exporte n'a que son prénom (UnitName). Les deux côtés passent par nameKey, qui coupe
// au premier tiret : l'addon fait de même (ancien royaume), quelle que soit sa version.
const firstNameKey = (n: string) => nameKey(n.trim().split(/\s+/)[0]);
const hasSurname = (n: string) => /\S\s+\S/.test(n.trim());
const sheetKey = (c: { name: string; surname: string | null }) => nameKey(c.surname?.trim() ? `${c.name} ${c.surname.trim()}` : c.name);

/**
 * Fiches qui correspondent à un nom du jeu. Avec le nom de famille : celles qui ont le même nom
 * complet, sinon celles du même prénom encore sans nom de famille (fiches d'avant son ajout).
 * Sans nom de famille : toutes celles du même prénom.
 */
function sheetsFor<T extends { c: { name: string; surname: string | null } }>(chars: T[], who: string): T[] {
	const samePrenom = chars.filter((r) => nameKey(r.c.name) === firstNameKey(who));
	if (!hasSurname(who)) return samePrenom;
	const exact = samePrenom.filter((r) => r.c.surname?.trim() && sheetKey(r.c) === nameKey(who.trim().replace(/\s+/g, ' ')));
	return exact.length ? exact : samePrenom.filter((r) => !r.c.surname?.trim());
}

/** Nom complet du perso qui exporte, d'après le registre : seul de ce prénom, ou seul de ce prénom et de sa classe. */
function fullName(player: NonNullable<GameExport['player']>, roster: NonNullable<GameExport['roster']>) {
	if (hasSurname(player.name)) return player.name;
	const same = roster.filter((m) => firstNameKey(m.name) === firstNameKey(player.name) && hasSurname(m.name));
	const candidates = same.length > 1 && player.class ? same.filter((m) => m.class === player.class) : same;
	return candidates.length === 1 ? candidates[0].name : player.name;
}

const professionBySkillLine = (skillLine: number | null | undefined, label: string | null | undefined) =>
	PROFESSIONS.find((p) => p.skillLine === skillLine) ?? PROFESSIONS.find((p) => label && nameKey(p.name) === nameKey(label));

/** Dernière connexion d'après le décalage donné par le jeu (années, mois, jours, heures). */
function lastOnline(exportedAt: number, member: NonNullable<GameExport['roster']>[number]) {
	if (member.online) return new Date(exportedAt * 1000);
	const o = member.offline ?? {};
	const hours = (o.years ?? 0) * 8766 + (o.months ?? 0) * 730.5 + (o.days ?? 0) * 24 + (o.hours ?? 0);
	return new Date(exportedAt * 1000 - hours * 3_600_000);
}

export interface CharacterUpdate {
	characterId: number;
	name: string;
	player: string;
	level?: { from: number; to: number };
	professions?: { from: ProfessionEntry[]; to: ProfessionEntry[] };
	recipes?: KnownRecipes[];
	lastOnlineAt?: Date;
	/** La fiche a des données d'un export plus récent : reconnue en jeu, rien n'est remplacé. */
	outdated?: true;
}

export interface ImportPlan {
	exportedAt: Date;
	guild: string | null;
	updates: CharacterUpdate[];
	/** Membres de la guilde en jeu sans fiche sur le site. */
	withoutSheet: { name: string; level: number; class: string | null; rank: string | null }[];
	/** Noms portés par plusieurs fiches : non mis à jour. */
	ambiguous: string[];
	/** Fiches déjà mises à jour par un export plus récent que celui-ci : non remplacées. */
	outdated: string[];
	/** Fiches du site absentes de la guilde en jeu (seulement si l'export contient le registre). */
	notFound: { characterId: number; name: string; player: string }[];
	rosterSize: number;
	/** Registre de l'export, gardé à l'application pour Admin → Import du jeu. */
	roster: GameRosterInfo['roster'];
	/** Recettes exportées par un jeu en français : leurs noms servent à traduire les autres. */
	frenchRecipes: KnownRecipes[];
}

export interface Homonym {
	characterId: number;
	name: string;
	surname: string | null;
	userId: string;
	player: string;
}

/**
 * Autres fiches que l'import ne sait pas distinguer de chacun de ces persos : même nom complet,
 * ou même prénom quand l'une n'a pas de nom de famille. L'import n'en met à jour aucune
 * (voir `ambiguous`). Clé : id du perso.
 */
export function homonyms(characterIds: number[]): Record<number, Homonym[]> {
	if (!characterIds.length) return {};
	const all = db()
		.select({ characterId: schema.characters.id, name: schema.characters.name, surname: schema.characters.surname, userId: schema.characters.userId, player: schema.users.displayName })
		.from(schema.characters)
		.innerJoin(schema.users, eq(schema.users.discordId, schema.characters.userId))
		.all();
	const byName = Map.groupBy(all, (c) => nameKey(c.name));
	const confused = (a: Homonym, b: Homonym) => !a.surname?.trim() || !b.surname?.trim() || sheetKey(a) === sheetKey(b);
	const result: Record<number, Homonym[]> = {};
	for (const c of all) {
		if (!characterIds.includes(c.characterId)) continue;
		const others = (byName.get(nameKey(c.name)) ?? []).filter((o) => o.characterId !== c.characterId && confused(c, o));
		if (others.length) result[c.characterId] = others;
	}
	return result;
}

/**
 * Compare l'export aux fiches. Pour les métiers, le jeu met à jour les niveaux et ajoute
 * ceux qui manquent, sans retirer les autres (l'onglet de guilde n'affiche peut-être pas
 * tous les métiers), sauf s'il faut libérer une place de métier principal.
 */
export function planImport(data: GameExport): ImportPlan {
	const chars = db()
		.select({ c: schema.characters, player: schema.users.displayName })
		.from(schema.characters)
		.innerJoin(schema.users, eq(schema.users.discordId, schema.characters.userId))
		.all();

	// Le perso qui exporte n'a que son prénom : son nom complet vient du registre, s'il y est seul
	// avec ce prénom (ou seul de sa classe), pour ne pas le confondre avec un homonyme.
	const exporter = data.player && { ...data.player, name: fullName(data.player, data.roster ?? []) };
	const isExporter = (key: string) => Boolean(exporter) && nameKey(exporter!.name) === key;

	// Métiers par perso : onglet de guilde, complété par les métiers du joueur qui exporte.
	const professions = new Map<string, { name: string; list: ProfessionEntry[] }>();
	const addProfession = (who: string, skillLine: number | null | undefined, label: string | null | undefined, skill: number | null | undefined) => {
		const p = professionBySkillLine(skillLine, label);
		if (!p) return;
		const entry = professions.get(nameKey(who)) ?? { name: who, list: [] };
		const level = skill == null ? null : Math.min(Math.max(skill, 1), MAX_PROFESSION_LEVEL);
		const existing = entry.list.find((e) => e.id === p.id);
		if (existing) existing.level = Math.max(existing.level ?? 0, level ?? 0) || null;
		else entry.list.push({ id: p.id, level });
		professions.set(nameKey(who), entry);
	};
	for (const group of data.guildProfessions ?? []) for (const m of group.members) addProfession(m.name, group.skillLine, group.name, m.skill);
	if (exporter) for (const p of data.professions ?? []) addProfession(exporter.name, p.skillLine, p.name, p.skill);

	const recipes: KnownRecipes[] = Object.values(data.recipes ?? {})
		.map((r) => ({ profession: professionBySkillLine(r.skillLine, r.name)?.id ?? r.name ?? '?', skill: r.skill ?? null, recipes: r.list }))
		.filter((r) => r.recipes.length);
	// Métiers du perso qui exporte, d'après le jeu (null si l'export n'en donne aucun : liste pas
	// encore chargée à la connexion, on ne retire rien sur cette base). Un métier dont l'export
	// contient des recettes compte aussi.
	const ownIds = (data.professions ?? []).map((p) => professionBySkillLine(p.skillLine, p.name)?.id).filter((id) => id !== undefined);
	const ownProfessions = exporter && ownIds.length ? new Set<string>([...ownIds, ...recipes.map((r) => r.profession)]) : null;

	const plan: ImportPlan = { exportedAt: new Date(data.exportedAt * 1000), guild: data.player?.guild ?? null, updates: [], withoutSheet: [], ambiguous: [], outdated: [], notFound: [], rosterSize: data.roster?.length ?? 0, roster: (data.roster ?? []).map((m) => ({ name: m.name, level: m.level, class: m.class ?? null, rank: m.rank ?? null })), frenchRecipes: isFrench(data.locale) ? recipes : [] };

	// Chaque nom du jeu une seule fois : registre, onglet des métiers, perso qui exporte.
	const people = new Map<string, { name: string; member?: NonNullable<GameExport['roster']>[number] }>();
	for (const m of data.roster ?? []) if (!people.has(nameKey(m.name))) people.set(nameKey(m.name), { name: m.name, member: m });
	for (const [key, { name }] of professions) if (!people.has(key)) people.set(key, { name });
	if (exporter && !people.has(nameKey(exporter.name))) people.set(nameKey(exporter.name), { name: exporter.name });

	// Une fiche visée par deux persos du jeu (fiche sans nom de famille, deux homonymes en jeu) :
	// impossible de savoir lequel c'est, aucun des deux ne la met à jour.
	const matched = [...people].map(([key, p]) => ({ key, ...p, matches: sheetsFor(chars, p.name) }));
	const claims = new Map<number, number>();
	for (const p of matched) for (const { c } of p.matches) claims.set(c.id, (claims.get(c.id) ?? 0) + 1);
	const ambiguousIds = new Set<number>();

	for (const { key, name: who, member, matches } of matched) {
		if (matches.length > 1 || (matches.length === 1 && claims.get(matches[0].c.id)! > 1)) {
			plan.ambiguous.push(who);
			for (const { c } of matches) ambiguousIds.add(c.id);
			continue;
		}
		if (matches.length === 0) {
			if (member) plan.withoutSheet.push({ name: who, level: member.level, class: CLASSES.find((c) => c.id === member.class?.toLowerCase())?.name ?? member.class ?? null, rank: member.rank ?? null });
			continue;
		}
		const { c, player } = matches[0];
		const update: CharacterUpdate = { characterId: c.id, name: c.name, player };
		// Fichier renvoyé après coup (autre compte WoW du même PC, export d'un autre joueur…) :
		// les données de la fiche sont plus récentes, on ne revient pas en arrière. Seules ses
		// recettes encore inconnues s'ajoutent : la fiche a pu être mise à jour par un registre
		// de guilde, qui n'en contient pas, et une recette apprise ne se perd pas.
		if (c.gameExportedAt && c.gameExportedAt.getTime() >= plan.exportedAt.getTime()) {
			plan.outdated.push(c.name);
			const added = isExporter(key) ? addRecipes(c.knownRecipes, recipes) : null;
			plan.updates.push({ ...update, outdated: true, ...(added && { recipes: added }) });
			continue;
		}
		const level = member?.level ?? (isExporter(key) ? exporter!.level : undefined);
		if (level && level !== c.level) update.level = { from: c.level, to: level };
		const profs = professions.get(key)?.list;
		// Le perso qui exporte : le jeu donne la liste complète de ses métiers, ceux qu'il a
		// abandonnés quittent la fiche, avec leurs recettes. Les autres : l'onglet de guilde
		// n'affiche peut-être pas tout, on ajoute sans retirer.
		const learned = isExporter(key) ? ownProfessions : null;
		const merged = profs && (learned ? sortProfessions(profs.filter((e) => learned.has(e.id))) : mergeProfessions(c.professions, profs));
		if (merged && !sameProfessions(c.professions, merged)) update.professions = { from: c.professions, to: merged };
		if (isExporter(key) && recipes.length) update.recipes = mergeRecipes(c.knownRecipes, recipes);
		const dropped = learned && (update.recipes ?? c.knownRecipes ?? []).filter((r) => isProfession(r.profession) && !learned.has(r.profession));
		if (dropped?.length) update.recipes = (update.recipes ?? c.knownRecipes ?? []).filter((r) => !dropped.includes(r));
		if (member) update.lastOnlineAt = lastOnline(data.exportedAt, member);
		plan.updates.push(update);
	}
	plan.withoutSheet.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
	// Sans registre (export d'un perso hors guilde…), on ne peut rien dire des absents.
	if (data.roster?.length) {
		const found = new Set(plan.updates.map((u) => u.characterId));
		plan.notFound = chars
			.filter(({ c }) => !found.has(c.id) && !ambiguousIds.has(c.id))
			.map(({ c, player }) => ({ characterId: c.id, name: c.name, player }))
		.sort((a, b) => a.player.localeCompare(b.player) || a.name.localeCompare(b.name));
	}
	return plan;
}

function mergeProfessions(current: ProfessionEntry[], fromGame: ProfessionEntry[]) {
	const isPrimary = (e: ProfessionEntry) => PROFESSIONS.some((p) => p.id === e.id && !p.secondary);
	let kept = current.filter((e) => !fromGame.some((g) => g.id === e.id));
	// Plus de 2 principaux : le perso a changé de métier en jeu, on garde ceux du jeu.
	if ([...kept, ...fromGame].filter(isPrimary).length > MAX_PRIMARY_PROFESSIONS) kept = kept.filter((e) => !isPrimary(e));
	return sortProfessions([...kept, ...fromGame]);
}

const isProfession = (id: string) => PROFESSIONS.some((p) => p.id === id);
const sortProfessions = (list: ProfessionEntry[]) => [...list].sort((a, b) => PROFESSIONS.findIndex((p) => p.id === a.id) - PROFESSIONS.findIndex((p) => p.id === b.id));
const sameProfessions = (a: ProfessionEntry[], b: ProfessionEntry[]) => JSON.stringify(sortProfessions(a)) === JSON.stringify(sortProfessions(b));

/** Les recettes d'un métier exporté remplacent celles déjà connues pour ce métier. */
function mergeRecipes(current: KnownRecipes[] | null, incoming: KnownRecipes[]) {
	const kept = (current ?? []).filter((r) => !incoming.some((i) => i.profession === r.profession));
	return [...kept, ...incoming];
}

/** Recettes d'un export plus ancien : ajoute seulement celles que la fiche ne connaît pas (null si aucune). */
function addRecipes(current: KnownRecipes[] | null, older: KnownRecipes[]) {
	let added = false;
	const result = (current ?? []).map((r) => ({ ...r, recipes: [...r.recipes] }));
	for (const o of older) {
		const known = result.find((r) => r.profession === o.profession);
		if (!known) {
			result.push(o);
			added ||= o.recipes.length > 0;
			continue;
		}
		for (const recipe of o.recipes) {
			if (known.recipes.some((r) => r.id === recipe.id)) continue;
			known.recipes.push(recipe);
			added = true;
		}
	}
	return added ? result : null;
}

/** Applique le plan ; renvoie le nombre de persos modifiés. `by` : qui a envoyé le fichier, et comment. */
export function applyImport(plan: ImportPlan, by: Pick<GameRosterInfo, 'by' | 'via'> = { by: null, via: 'manual' }) {
	let changed = 0;
	// À la seconde : les dates sont stockées en secondes, la comparaison doit tomber juste.
	const now = new Date(Math.floor(Date.now() / 1000) * 1000);
	if (plan.frenchRecipes.length) learnFrenchNames(plan.frenchRecipes);
	db().transaction((tx) => {
		for (const u of plan.updates) {
			const values: Partial<Character> = { gameSyncedAt: now };
			if (!u.outdated) values.gameExportedAt = plan.exportedAt;
			if (u.level) values.level = u.level.to;
			if (u.professions) values.professions = u.professions.to;
			if (u.recipes) values.knownRecipes = translateRecipes(u.recipes);
			if (u.lastOnlineAt) values.lastOnlineAt = u.lastOnlineAt;
			if (u.level || u.professions || u.recipes) {
				values.updatedAt = now;
				changed++;
			}
			tx.update(schema.characters).set(values).where(eq(schema.characters.id, u.characterId)).run();
		}
	});
	// Référence des badges « vu en jeu » : seulement pour un export qui contient le registre,
	// et pas pour un registre plus ancien que celui déjà retenu.
	const reference = getGameImport();
	const older = reference && Math.floor(plan.exportedAt.getTime() / 1000) < reference.exportedAt;
	if (plan.rosterSize > 0 && !older) {
		const dates = { appliedAt: now.getTime() / 1000, exportedAt: Math.floor(plan.exportedAt.getTime() / 1000) };
		setGameImport({ ...dates, rosterSize: plan.rosterSize });
		setGameRoster({ ...dates, ...by, roster: plan.roster });
	}
	// Noms français manquants (jeu en anglais…) : demandés à Wowhead en arrière-plan.
	if (plan.updates.some((u) => u.recipes)) scheduleTranslation();
	return changed;
}

/**
 * Dernier registre de guilde reçu, comparé aux fiches d'aujourd'hui : une fiche corrigée sort
 * des listes sans attendre le prochain envoi. Null avant le premier registre.
 */
export function rosterReport() {
	const last = getGameRoster();
	if (!last) return null;
	const plan = planImport({ format: 1, exportedAt: last.exportedAt, roster: last.roster });
	return {
		appliedAt: new Date(last.appliedAt * 1000),
		by: last.by,
		via: last.via,
		rosterSize: last.roster.length,
		linked: plan.updates.length,
		withoutSheet: plan.withoutSheet,
		notFound: plan.notFound,
		ambiguous: plan.ambiguous
	};
}
