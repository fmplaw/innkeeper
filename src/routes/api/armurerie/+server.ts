import { error, json } from '@sveltejs/kit';
import { lookupCharacter } from '$lib/server/battlenet';
import type { RequestHandler } from './$types';

// Recherche d'un perso dans l'Armurerie de Blizzard, pour le formulaire de perso (Mes persos,
// candidature) : réservée aux personnes connectées, 30 recherches par minute chacune.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const recent = new Map<string, number[]>();

export const GET: RequestHandler = async ({ locals, url }) => {
	const who = locals.user?.id ?? locals.candidate?.id ?? (locals.admin ? `admin:${locals.admin.id}` : null);
	if (!who) error(401, 'Connexion requise');
	const now = Date.now();
	const hits = (recent.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
	if (hits.length >= MAX_PER_WINDOW) return json({ status: 'unavailable' }, { status: 429 });
	recent.set(who, [...hits, now]);
	if (recent.size > 1000) recent.clear();

	const name = (url.searchParams.get('prenom') ?? '').trim().slice(0, 24);
	const surname = (url.searchParams.get('nom') ?? '').trim().slice(0, 24);
	if (name.length < 2 || surname.length < 2) return json({ status: 'unavailable' });
	return json(await lookupCharacter(name, surname));
};
