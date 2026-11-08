import { artisansByProfession } from '$lib/server/artisans';
import { requireViewer } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireViewer(locals);
	// Commander demande un compte Discord (l'admin local n'en a pas).
	return { professions: artisansByProfession(), canOrder: Boolean(locals.user) };
};
