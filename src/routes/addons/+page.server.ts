import { listAddons } from '$lib/server/addons';
import { getMain } from '$lib/server/characters';
import type { PageServerLoad } from './$types';

// Page publique : un futur candidat peut préparer son interface avant de rejoindre.
export const load: PageServerLoad = ({ locals }) => {
	const main = locals.user ? getMain(locals.user.id) : undefined;
	return {
		addons: listAddons(),
		// Pour le filtre « Pour mon main » : classe et rôles (spé principale et secondaire).
		main: main ? { class: main.class, roles: [main.role, ...(main.role2 ? [main.role2] : [])] } : null
	};
};
