import { artisansByProfession } from '$lib/server/artisans';
import { requireViewer } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireViewer(locals);
	return { professions: artisansByProfession() };
};
