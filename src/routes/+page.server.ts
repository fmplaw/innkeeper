import { getGuild } from '$lib/server/settings';
import { publicStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

// Accueil public : présentation de la guilde, visible sans connexion.
export const load: PageServerLoad = () => {
	const guild = getGuild();
	return {
		profile: guild && {
			description: guild.description,
			ambitions: guild.ambitions,
			schedule: guild.schedule,
			recruitment: guild.recruitment,
			discordInvite: guild.discordInvite
		},
		stats: guild?.publicStats ? publicStats() : null
	};
};
