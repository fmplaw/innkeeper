import { artisansByProfession } from '$lib/server/artisans';
import { priceTable } from '$lib/server/auction';
import { artisanStats } from '$lib/server/crafts';
import { requireViewer } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireViewer(locals);
	// Commander demande un compte Discord (l'admin local n'en a pas).
	const professions = artisansByProfession();
	// Prix de l'HV des composants connus, pour le coût estimé des recettes trouvées.
	const ids = professions.flatMap((p) => p.artisans.flatMap((a) => a.recipes.flatMap((r) => (r.reagents ?? []).map((x) => x.id))));
	// Commandes livrées par joueur ; les 👎 seulement pour les officiers et l'artisan lui-même.
	const officer = Boolean(locals.admin || locals.user?.permission === 'officer');
	const crafts = Object.fromEntries(
		artisanStats().map((s) => [s.playerId, { delivered: s.delivered, up: s.up, down: officer || s.playerId === locals.user?.id ? s.down : 0 }])
	);
	return { professions, canOrder: Boolean(locals.user), crafts, ...priceTable(ids) };
};
