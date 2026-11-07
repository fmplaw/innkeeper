import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { audit } from './audit';
import { BotError, addRole, botReady, guildMember, postMessage, removeRole } from './bot';
import { db, schema } from './db';
import { permissionFor } from './permissions';
import { getBattlenet, getGuild, getRecruitment } from './settings';

// Départs de la guilde. À chaque synchronisation Battle.net, un joueur dont aucun perso n'est plus
// dans le registre de la guilde en jeu est soupçonné d'être parti ; le départ est confirmé à une
// synchronisation suivante si l'Armurerie montre un de ses persos dans une autre guilde (ou sans
// guilde). Un officier peut aussi noter un départ à la main. Un ancien membre n'a plus accès au
// site et disparaît des pages des membres (roster, artisans, statistiques) ; les officiers le
// retrouvent dans Admin → Anciens membres. Rien n'est supprimé : un retour le réintègre.
//
// Jamais automatique pour un officier ni pour un admin de l'instance : ils restent « à confirmer ».

const { users, characters } = schema;

// Journal : sans session (synchronisation automatique), l'action est attribuée au « Système ».
const SYSTEM = { user: null, candidate: null, admin: null } as unknown as App.Locals;
const target = (u: { discordId: string; displayName: string }) => ({ label: u.displayName, url: '/admin/anciens' });

// Absent du registre depuis au moins 5 h (deux synchronisations) avant de confirmer : un registre
// incomplet une fois ne fait partir personne.
export const CONFIRM_AFTER_MS = 5 * 3_600_000;

type Lookup = (name: string, surname: string | null) => Promise<{ status: 'found'; guild: string | null } | { status: 'missing' | 'unavailable' }>;

/** « Le Pacte des Anciens » → « le-pacte-des-anciens », comme l'identifiant Battle.net d'une guilde. */
export const guildKey = (name: string) =>
	name
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** Le perso est-il dans notre guilde d'après l'Armurerie ? (nom de la guilde ou identifiant Battle.net) */
function isOurGuild(guild: string) {
	const key = guildKey(guild);
	const ours = [getBattlenet().guildSlug, getGuild()?.name ?? ''].filter(Boolean).map(guildKey);
	return ours.includes(key);
}

export interface DepartureReport {
	suspected: string[];
	left: string[];
	returned: string[];
}

/**
 * Après une synchronisation du registre complet de la guilde (`seen` : fiches reconnues dans le
 * registre). `rosterSize` protège d'un registre vide ou tronqué renvoyé par erreur.
 */
export async function detectDepartures(seen: Set<number>, rosterSize: number, lookup: Lookup, now = new Date()): Promise<DepartureReport> {
	const report: DepartureReport = { suspected: [], left: [], returned: [] };
	if (rosterSize === 0 || seen.size === 0) return report;

	const all = db().select().from(users).all();
	const chars = db()
		.select({ id: characters.id, userId: characters.userId, name: characters.name, surname: characters.surname, gameSyncedAt: characters.gameSyncedAt, isMain: characters.isMain })
		.from(characters)
		.all();

	for (const u of all) {
		const own = chars.filter((c) => c.userId === u.discordId);
		const inGuild = own.some((c) => seen.has(c.id));

		if (inGuild) {
			// Retour en jeu d'un départ détecté par Battle.net : réintégré (un départ noté par un
			// officier reste son choix). Les rôles Discord, eux, sont rendus par les officiers.
			if (u.leftAt && u.leftBy === 'Battle.net') {
				reinstate(u.discordId, null);
				report.returned.push(u.displayName);
				await announce(`De retour dans la guilde : ${u.displayName}`, `Un de ses persos est revenu dans le registre de la guilde en jeu. Sa fiche est de nouveau visible ; pense à lui rendre ses rôles sur Discord.`);
			} else if (u.absentSince) {
				db().update(users).set({ absentSince: null }).where(eq(users.discordId, u.discordId)).run();
			}
			continue;
		}

		// Seuls comptent les joueurs déjà vus dans la guilde en jeu : une fiche jamais reconnue
		// (perso pas encore créé, nom mal saisi) ne dit rien d'un départ.
		const seenBefore = own.filter((c) => c.gameSyncedAt);
		if (u.leftAt || !seenBefore.length) continue;

		if (!u.absentSince) {
			db().update(users).set({ absentSince: now }).where(eq(users.discordId, u.discordId)).run();
			report.suspected.push(u.displayName);
			continue;
		}
		if (now.getTime() - u.absentSince.getTime() < CONFIRM_AFTER_MS) continue;
		if (u.instanceAdmin || permissionFor(u) === 'officer') continue;

		// Confirmation par l'Armurerie : un perso trouvé dans une autre guilde, ou sans guilde.
		// Trouvé dans notre guilde → registre en retard, on attend ; introuvable → à confirmer à la main.
		let elsewhere: { guild: string | null } | null = null;
		let stillHere = false;
		for (const c of seenBefore.sort((a, b) => Number(b.isMain) - Number(a.isMain))) {
			const r = await lookup(c.name, c.surname);
			if (r.status !== 'found') continue;
			if (r.guild && isOurGuild(r.guild)) stillHere = true;
			else elsewhere ??= { guild: r.guild };
		}
		if (stillHere || !elsewhere) continue;
		await markLeft(u.discordId, null, { by: 'Battle.net', forGuild: elsewhere.guild, now });
		report.left.push(u.displayName);
	}
	return report;
}

/**
 * Départ confirmé : plus d'accès au site, fiches masquées, rôles retirés par le bot si la guilde
 * l'a choisi, annonce aux officiers. `by` : « Battle.net » ou le nom de l'officier.
 */
export async function markLeft(userId: string, locals: App.Locals | null, opts: { by: string; forGuild?: string | null; comment?: string | null; now?: Date }) {
	const u = db().select().from(users).where(eq(users.discordId, userId)).get();
	if (!u || u.leftAt) return null;
	const manual = opts.by !== 'Battle.net';
	const discord = await demote(userId);
	db()
		.update(users)
		.set({
			leftAt: opts.now ?? new Date(),
			leftBy: opts.by,
			leftForGuild: opts.forGuild ?? null,
			leftDiscord: discord,
			leftComment: opts.comment?.trim() || null,
			// Noté par un officier : il en a forcément pris connaissance.
			leftSeenAt: manual ? new Date() : null,
			absentSince: null
		})
		.where(eq(users.discordId, userId))
		.run();

	audit(locals ?? SYSTEM, 'member.left', target(u), { par: opts.by, guilde: opts.forGuild ?? undefined, discord: discord ?? undefined });
	const where = opts.forGuild ? `a rejoint la guilde « ${opts.forGuild} »` : manual ? `départ noté par ${opts.by}` : 'a quitté la guilde en jeu (sans nouvelle guilde)';
	await announce(`Départ de la guilde : ${u.displayName}`, [`${u.displayName} ${where}.`, discord, opts.comment?.trim() ? `Commentaire : ${opts.comment.trim()}` : ''].filter(Boolean).join('\n'));
	return u;
}

/** Réintègre un ancien membre : fiches de nouveau visibles. Ses rôles Discord ne sont pas rendus. */
export function reinstate(userId: string, locals: App.Locals | null) {
	const u = db().select().from(users).where(eq(users.discordId, userId)).get();
	if (!u?.leftAt) return null;
	audit(locals ?? SYSTEM, 'member.reinstate', target(u), locals ? undefined : { par: 'Battle.net' });
	db()
		.update(users)
		.set({ leftAt: null, leftBy: null, leftForGuild: null, leftDiscord: null, leftComment: null, leftSeenAt: null, absentSince: null })
		.where(eq(users.discordId, userId))
		.run();
	return u;
}

export function setLeftComment(userId: string, comment: string, locals: App.Locals) {
	const u = db().select().from(users).where(eq(users.discordId, userId)).get();
	if (!u?.leftAt) return null;
	audit(locals, 'member.left-comment', target(u));
	db()
		.update(users)
		.set({ leftComment: comment.trim() || null, leftSeenAt: new Date() })
		.where(eq(users.discordId, userId))
		.run();
	return u;
}

export const markSeen = (userId: string) =>
	db().update(users).set({ leftSeenAt: new Date() }).where(and(eq(users.discordId, userId), isNotNull(users.leftAt))).run();

/** Départs dont aucun officier n'a encore pris connaissance (compteur du menu). */
export const unseenDepartures = () => db().select({ id: users.discordId }).from(users).where(and(isNotNull(users.leftAt), isNull(users.leftSeenAt))).all().length;

/** Identifiants des anciens membres, pour masquer leurs fiches. */
export const formerMemberIds = () => db().select({ id: users.discordId }).from(users).where(isNotNull(users.leftAt)).all().map((u) => u.id);

/** Anciens membres et départs soupçonnés, avec leurs persos (vue des officiers). */
export function listDepartures() {
	const rows = db()
		.select()
		.from(users)
		.where(isNotNull(users.leftAt))
		.orderBy(desc(users.leftAt))
		.all();
	const suspects = db()
		.select()
		.from(users)
		.where(and(isNull(users.leftAt), isNotNull(users.absentSince)))
		.orderBy(desc(users.absentSince))
		.all();
	const ids = [...rows, ...suspects].map((u) => u.discordId);
	const chars = ids.length ? db().select().from(characters).where(inArray(characters.userId, ids)).all() : [];
	const view = (u: typeof users.$inferSelect) => ({
		id: u.discordId,
		displayName: u.displayName,
		username: u.discordUsername,
		avatar: u.avatar,
		officer: u.instanceAdmin || permissionFor({ ...u, leftAt: null }) === 'officer',
		absentSince: u.absentSince,
		leftAt: u.leftAt,
		leftBy: u.leftBy,
		leftForGuild: u.leftForGuild,
		leftDiscord: u.leftDiscord,
		leftComment: u.leftComment,
		seen: Boolean(u.leftSeenAt),
		characters: chars.filter((c) => c.userId === u.discordId).sort((a, b) => Number(b.isMain) - Number(a.isMain))
	});
	return { former: rows.map(view), suspects: suspects.map(view) };
}

// Discord : rôles de membre (et rôle d'arrivée) retirés, rôle des anciens membres donné. Renvoie
// un compte rendu pour les officiers, ou null si la guilde n'a pas activé la rétrogradation.
async function demote(userId: string): Promise<string | null> {
	const settings = getRecruitment();
	if (!settings.demoteFormer) return null;
	if (!botReady()) return 'Rôles Discord non modifiés : le bot n’est pas configuré.';
	const reason = 'A quitté la guilde (Innkeeper)';
	try {
		const member = await guildMember(userId);
		if (!member) return 'N’est plus sur le serveur Discord : aucun rôle à retirer.';
		const known = db().select().from(schema.discordRoles).all();
		const label = (id: string) => {
			const r = known.find((k) => k.id === id);
			return r?.name ?? r?.label ?? id;
		};
		const toRemove = member.roles.filter((id) => id !== settings.formerRoleId && (id === settings.arrivalRoleId || known.some((k) => k.id === id && k.permission === 'member')));
		const done: string[] = [];
		const failed: string[] = [];
		for (const id of toRemove) {
			try {
				await removeRole(userId, id, reason);
				done.push(label(id));
			} catch {
				failed.push(label(id));
			}
		}
		let given: string | null = null;
		if (settings.formerRoleId && !member.roles.includes(settings.formerRoleId)) {
			try {
				await addRole(userId, settings.formerRoleId, reason);
				given = label(settings.formerRoleId);
			} catch {
				failed.push(`ajout de ${label(settings.formerRoleId)}`);
			}
		}
		const lines = [
			done.length ? `Rôles retirés par le bot : ${done.join(', ')}.` : 'Aucun rôle de membre à retirer.',
			given ? `Rôle donné : ${given}.` : '',
			failed.length ? `Échec : ${failed.join(', ')} (le rôle du bot doit être placé au-dessus sur Discord).` : ''
		];
		return lines.filter(Boolean).join(' ');
	} catch (e) {
		return `Rôles Discord non modifiés : ${e instanceof BotError ? e.message : 'Discord ne répond pas.'}`;
	}
}

// Annonce dans le salon des officiers (celui des candidatures). Une erreur Discord ne bloque rien.
async function announce(title: string, description: string) {
	const { notifyChannelId } = getRecruitment();
	if (!botReady() || !notifyChannelId) return;
	try {
		const color = parseInt((getGuild()?.accentColor ?? '#b3261e').slice(1), 16);
		await postMessage(notifyChannelId, { embeds: [{ title, url: `${env.ORIGIN ?? ''}/admin/anciens`, color, description }] });
	} catch (e) {
		console.error('Annonce de départ impossible :', e instanceof Error ? e.message : e);
	}
}
