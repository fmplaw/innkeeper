import { artisansByProfession } from '$lib/server/artisans';
import { priceTable } from '$lib/server/auction';
import { requireViewer } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireViewer(locals);
	// Commander demande un compte Discord (l'admin local n'en a pas).
	const professions = artisansByProfession();
	// Prix de l'HV des composants connus, pour le coût estimé des recettes trouvées.
	const ids = professions.flatMap((p) => p.artisans.flatMap((a) => a.recipes.flatMap((r) => (r.reagents ?? []).map((x) => x.id))));
	return { professions, canOrder: Boolean(locals.user), ...priceTable(ids) };
};
