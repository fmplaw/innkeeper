import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from './db';
import { getAuthSecret } from './settings';

// Comptes admin local d'instance : installation et accès de secours, hors Discord. Le premier
// est créé par l'assistant d'installation ; un admin peut en ajouter d'autres (Compte admin).

const COOKIE = 'admin_session';
const SESSION_TTL_S = 12 * 3600;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password: string) {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
	return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password: string, stored: string) {
	const [algo, salt, hash] = stored.split('$');
	if (algo !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'base64');
	const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, SCRYPT);
	return timingSafeEqual(actual, expected);
}

export const hasLocalAdmin = () => Boolean(db().select({ id: schema.localAdmins.id }).from(schema.localAdmins).get());

export function createLocalAdmin(username: string, password: string) {
	return db()
		.insert(schema.localAdmins)
		.values({ username, passwordHash: hashPassword(password) })
		.returning()
		.get();
}

export function setLocalAdminPassword(id: number, password: string) {
	db().update(schema.localAdmins).set({ passwordHash: hashPassword(password), mustChangePassword: false }).where(eq(schema.localAdmins.id, id)).run();
}

// Pages ouvertes à un admin qui n'a pas encore remplacé son mot de passe provisoire.
const PASSWORD_CHANGE_OPEN = ['/admin/compte', '/admin/connexion', '/healthz', '/logo', '/banniere'];

/** Admin ajouté avec un mot de passe provisoire : il le change avant de pouvoir agir ailleurs. */
export const mustChangePasswordFirst = (admin: { mustChangePassword: boolean } | null, path: string) =>
	Boolean(admin?.mustChangePassword) && !PASSWORD_CHANGE_OPEN.some((p) => path === p || path.startsWith(`${p}/`));

export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
export const USERNAME_HINT = '3 à 32 caractères : lettres, chiffres, point, tiret, tiret bas.';

export function listLocalAdmins() {
	return db()
		.select({ id: schema.localAdmins.id, username: schema.localAdmins.username, createdBy: schema.localAdmins.createdBy, createdAt: schema.localAdmins.createdAt, mustChangePassword: schema.localAdmins.mustChangePassword })
		.from(schema.localAdmins)
		.orderBy(schema.localAdmins.id)
		.all();
}

/**
 * Ajout d'un admin par un autre : mot de passe provisoire généré, à transmettre une seule fois,
 * que le nouvel admin doit changer avant de pouvoir faire quoi que ce soit.
 */
export function addLocalAdmin(username: string, createdBy: string) {
	if (!USERNAME_PATTERN.test(username)) return { error: USERNAME_HINT } as const;
	const taken = db().select({ id: schema.localAdmins.id }).from(schema.localAdmins).where(eq(schema.localAdmins.username, username)).get();
	if (taken) return { error: 'Cet identifiant est déjà pris.' } as const;
	const password = randomBytes(15).toString('base64url');
	const admin = db()
		.insert(schema.localAdmins)
		.values({ username, passwordHash: hashPassword(password), mustChangePassword: true, createdBy })
		.returning()
		.get();
	return { admin, password } as const;
}

/** Retire un admin ; jamais soi-même ni le dernier (l'instance resterait sans accès de secours). */
export function removeLocalAdmin(id: number, by: { id: number }) {
	if (id === by.id) return { error: 'Tu ne peux pas retirer ton propre compte.' } as const;
	const admins = listLocalAdmins();
	const target = admins.find((a) => a.id === id);
	if (!target) return { error: 'Compte introuvable.' } as const;
	if (admins.length <= 1) return { error: 'Il faut garder au moins un admin.' } as const;
	// Ses sessions tombent avec lui : sessionAdmin ne trouve plus le compte.
	db().delete(schema.localAdmins).where(eq(schema.localAdmins.id, id)).run();
	return { removed: target } as const;
}

// Le hash du mot de passe entre dans la signature : changer le mot de passe
// invalide les sessions existantes.
function sign(id: number, exp: number, passwordHash: string) {
	return createHmac('sha256', getAuthSecret()).update(`${id}.${exp}.${passwordHash}`).digest('base64url');
}

export function openSession(cookies: Cookies, admin: { id: number; passwordHash: string }, secure: boolean) {
	const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
	cookies.set(COOKIE, `${admin.id}.${exp}.${sign(admin.id, exp, admin.passwordHash)}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_TTL_S
	});
}

export const closeSession = (cookies: Cookies) => cookies.delete(COOKIE, { path: '/' });

/** Admin local de la session, ou null. */
export function sessionAdmin(cookies: Cookies) {
	const [rawId, rawExp, sig] = (cookies.get(COOKIE) ?? '').split('.');
	const id = Number(rawId);
	const exp = Number(rawExp);
	if (!id || !exp || !sig || exp < Date.now() / 1000) return null;

	const admin = db().select().from(schema.localAdmins).where(eq(schema.localAdmins.id, id)).get();
	if (!admin) return null;
	const expected = Buffer.from(sign(id, exp, admin.passwordHash));
	const given = Buffer.from(sig);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	return { id: admin.id, username: admin.username, mustChangePassword: admin.mustChangePassword };
}

// Limite de tentatives par adresse : 10 essais par quart d'heure.
const attempts = new Map<string, { count: number; reset: number }>();

export function login(username: string, password: string, address: string) {
	const now = Date.now();
	const entry = attempts.get(address);
	if (entry && entry.reset > now && entry.count >= 10) return { error: 'Trop de tentatives, réessaie dans quelques minutes.' } as const;

	const admin = db().select().from(schema.localAdmins).where(eq(schema.localAdmins.username, username)).get();
	if (admin && verifyPassword(password, admin.passwordHash)) {
		attempts.delete(address);
		return { admin } as const;
	}
	attempts.set(address, entry && entry.reset > now ? { ...entry, count: entry.count + 1 } : { count: 1, reset: now + 15 * 60_000 });
	// Les adresses dont le quart d'heure est écoulé ne servent plus : on les oublie.
	if (attempts.size > 1000) for (const [a, e] of attempts) if (e.reset <= now) attempts.delete(a);
	return { error: 'Identifiants incorrects.' } as const;
}

// Code d'installation à usage unique, affiché dans les logs tant qu'aucun admin
// local n'existe : empêche un inconnu de s'approprier une instance fraîchement exposée.
let setupToken: string | null = null;

export function setupCode() {
	setupToken ??= randomBytes(9).toString('base64url');
	return setupToken;
}

export function checkSetupCode(code: string) {
	const expected = Buffer.from(setupCode());
	const given = Buffer.from(code.trim());
	return expected.length === given.length && timingSafeEqual(expected, given);
}

export const consumeSetupCode = () => {
	setupToken = null;
};
