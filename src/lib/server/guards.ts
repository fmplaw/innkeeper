import { error, redirect } from '@sveltejs/kit';

/** Joueur connecté via Discord (pages personnelles : ses persos). */
export function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(303, locals.candidate ? '/postuler' : '/connexion');
	return locals.user;
}

/** Joueur connecté ou admin local (pages de consultation : roster, sorties). */
export function requireViewer(locals: App.Locals) {
	if (!locals.user && !locals.admin) redirect(303, locals.candidate ? '/postuler' : '/connexion');
}

/** Officier Discord ou admin local. */
export function requireOfficer(locals: App.Locals) {
	if (locals.admin) return;
	const user = requireUser(locals);
	if (user.permission !== 'officer') error(403, 'Réservé aux officiers');
}

/** Admin de l'instance : l'admin local, ou un compte Discord qu'il a désigné comme admin. */
export const isInstanceAdmin = (locals: App.Locals) => Boolean(locals.admin || locals.user?.instanceAdmin);

/** Réglages de l'instance (connexion Discord, rôles, journal…) : admin local ou admin Discord. */
export function requireInstanceAdmin(locals: App.Locals) {
	if (!isInstanceAdmin(locals)) redirect(303, '/admin/connexion');
}

/** Admin local uniquement : comptes admin, désignation des admins Discord, installation. */
export function requireLocalAdmin(locals: App.Locals) {
	if (!locals.admin) redirect(303, '/admin/connexion');
	return locals.admin;
}
