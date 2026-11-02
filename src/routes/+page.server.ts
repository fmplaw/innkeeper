import { upcomingOutings } from '$lib/server/outings';
import { getGuild } from '$lib/server/settings';
import { publicStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

// Accueil public : présentation de la guilde, visible sans connexion.
export const load: PageServerLoad = async ({ locals }) => {
	const guild = getGuild();
	// Membre connecté : la prochaine sortie, en tête de l'accueil. Une panne de Raid-Helper ne bloque pas la page.
	const nextOuting = locals.user ? ((await upcomingOutings()).events?.[0] ?? null) : null;
	return {
		nextOuting,
		timezone: guild?.timezone ?? 'Europe/Paris',
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
