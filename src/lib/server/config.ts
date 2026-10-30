import {
	CLASSES,
	DUAL_SPEC_LEVEL,
	MAX_LEVEL,
	PROFESSIONS,
	racesFor,
	type GuildFaction
} from '$lib/game/forever';
import { DEFAULT_ACCENTS, getGuild } from './settings';

/** Données transmises au navigateur : jeu Forever + profil public de la guilde. */
export function publicConfig() {
	const guild = getGuild();
	const faction: GuildFaction = guild?.faction ?? 'both';
	return {
		guild: {
			name: guild?.name ?? 'Innkeeper',
			faction,
			tagline: guild?.tagline ?? '',
			accentColor: guild?.accentColor ?? DEFAULT_ACCENTS[faction],
			timezone: guild?.timezone ?? 'Europe/Paris',
			// Le nom du fichier change à chaque envoi : il sert de version contre le cache.
			logoUrl: guild?.logo ? `/logo?v=${guild.logo}` : null,
			bannerUrl: guild?.banner ? `/banniere?v=${guild.banner}` : null,
			bannerTitle: !guild?.banner || (guild?.bannerTitle ?? true)
		},
		maxLevel: MAX_LEVEL,
		dualSpecLevel: DUAL_SPEC_LEVEL,
		races: racesFor(faction),
		classes: CLASSES,
		professions: PROFESSIONS
	};
}

export type PublicConfig = ReturnType<typeof publicConfig>;
