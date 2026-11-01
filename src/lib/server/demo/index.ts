import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db, schema } from '../db';
import { openSession } from '../local-admin';
import { getDemoMarker, getGuild, setDemoEvents } from '../settings';
import { installDemoFetch } from './mock';
import { DEMO_CHANNELS, DEMO_GUILD_ID, demoUserId, seedDemo } from './seed';

// Mode démo (INNKEEPER_DEMO=1) : guilde fictive, Discord et Raid-Helper simulés, connexion par
// choix de profil. Pour essayer Innkeeper, prévisualiser une branche ou prendre des captures.
// Jamais sur une vraie base : le mode démo ne démarre que sur une base vide ou déjà de démo.

export const demoEnabled = () => env.INNKEEPER_DEMO === '1';

/** Au démarrage : remplit une base vide, refuse une vraie base, branche la simulation. */
export function initDemo() {
	if (!getGuild()) setDemoEvents(seedDemo());
	else if (!getDemoMarker())
		throw new Error('INNKEEPER_DEMO=1 sur une base qui n’est pas une base de démo : refusé. Retire la variable, ou utilise un volume de données vide.');
	installDemoFetch(Object.values(DEMO_CHANNELS), { id: DEMO_GUILD_ID, name: getGuild()?.name ?? 'Démo' });
	console.log('\n=== Innkeeper en mode démo ===\nGuilde fictive, Discord et Raid-Helper simulés. Connexion : choix du profil sur /connexion.\n');
}

/** Profils proposés à la connexion : un par niveau d'accès. */
export const DEMO_PROFILES = [
	{ key: 'admin', label: 'Admin de l’instance', description: 'Tous les réglages : Discord, rôles, journal, comptes admin.', pseudo: null },
	{ key: 'officer', label: 'Officier', description: 'Aldren : candidatures, rosters, sorties officielles, admin de la guilde.', pseudo: 'Aldren' },
	{ key: 'member', label: 'Membre', description: 'Pipwick : ses persos, le roster, les sorties et inscriptions.', pseudo: 'Pipwick' },
	{ key: 'newcomer', label: 'Nouvelle recrue', description: 'Tamsin : membre récent, suivi dans la progression.', pseudo: 'Tamsin' },
	{ key: 'candidate', label: 'Candidat', description: 'Aelith : pas encore dans la guilde, voit sa candidature.', pseudo: 'Aelith' }
] as const;

const COOKIE = 'demo_user';

/** Joueur Discord simulé de la session de démo, ou null. */
export function demoSessionUser(cookies: Cookies) {
	const id = cookies.get(COOKIE);
	if (!id) return null;
	return db().select({ id: schema.users.discordId }).from(schema.users).where(eq(schema.users.discordId, id)).get()?.id ?? null;
}

/** Entre dans la démo avec un profil ; renvoie false si le profil est inconnu. */
export function enterDemo(cookies: Cookies, key: string, secure: boolean) {
	const profile = DEMO_PROFILES.find((p) => p.key === key);
	if (!profile) return false;
	leaveDemo(cookies);
	if (profile.pseudo) {
		cookies.set(COOKIE, demoUserId(profile.pseudo), { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 12 * 3600 });
	} else {
		const admin = db().select().from(schema.localAdmins).limit(1).get();
		if (!admin) return false;
		openSession(cookies, admin, secure);
	}
	return true;
}

export function leaveDemo(cookies: Cookies) {
	cookies.delete(COOKIE, { path: '/' });
	cookies.delete('admin_session', { path: '/' });
}
