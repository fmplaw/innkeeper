import { requireOfficer } from '$lib/server/guards';
import { officerStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	return { stats: officerStats() };
};
