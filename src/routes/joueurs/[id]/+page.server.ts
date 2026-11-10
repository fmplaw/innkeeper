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
	const isMe = locals.user?.id === player.id;
	// Commander à ce joueur depuis ses recettes : membre connecté, et pas à soi-même.
	return { player, officer, isMe, canOrder: Boolean(locals.user) && !isMe };
};
