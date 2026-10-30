import { publicConfig } from '$lib/server/config';
import { dueReviewCount } from '$lib/server/progression';
import { pendingCount } from '$lib/server/recruitment';
import { getGameImport } from '$lib/server/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	// Lire le chemin rend ce chargement dépendant de la page : les compteurs du menu sont
	// recalculés à chaque navigation, sinon ils restent figés après une décision.
	void url.pathname;
	const officer = Boolean(locals.admin || locals.user?.permission === 'officer');
	const gameImport = locals.user || locals.admin ? getGameImport() : null;
	return {
		user: locals.user,
		candidate: locals.candidate,
		admin: locals.admin,
		config: publicConfig(),
		pendingApplications: officer ? pendingCount() : 0,
		dueReviews: officer ? dueReviewCount() : 0,
		// Dernier import du registre de guilde, pour les badges « vu en jeu ».
		gameImportAt: gameImport ? new Date(gameImport.appliedAt * 1000) : null
	};
};
