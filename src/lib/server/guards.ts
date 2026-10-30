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

/** Admin local uniquement (connexion Discord de l'instance). */
export function requireLocalAdmin(locals: App.Locals) {
	if (!locals.admin) redirect(303, '/admin/connexion');
	return locals.admin;
}
