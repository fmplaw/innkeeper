import { APPLICATION_STATUSES } from '$lib/server/db/schema';
import { requireOfficer } from '$lib/server/guards';
import { listApplications } from '$lib/server/recruitment';
import type { PageServerLoad } from './$types';

type Status = (typeof APPLICATION_STATUSES)[number];

export const load: PageServerLoad = ({ locals, url }) => {
	requireOfficer(locals);
	const statut = (url.searchParams.get('statut') ?? 'pending') as Status;
	const status = APPLICATION_STATUSES.includes(statut) ? statut : 'pending';
	return { status, applications: listApplications([status]) };
};
