import { getCharter } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

// Page publique : un futur candidat doit pouvoir la lire avant de se connecter.
export const load: PageServerLoad = () => ({ charter: getCharter() });
