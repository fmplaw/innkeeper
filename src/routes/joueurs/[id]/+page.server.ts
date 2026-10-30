import { error } from '@sveltejs/kit';
import { requireViewer } from '$lib/server/guards';
import { getPlayer } from '$lib/server/players';
import { isOfficer } from '$lib/server/rosters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	requireViewer(locals);
	const officer = isOfficer(locals);
	const player = getPlayer(params.id, officer);
	if (!player) error(404, 'Joueur introuvable');
	return { player, officer, isMe: locals.user?.id === player.id };
};
