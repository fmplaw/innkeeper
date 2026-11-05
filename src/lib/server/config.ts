import {
	CLASSES,
	DUAL_SPEC_LEVEL,
	MAX_LEVEL,
	PROFESSIONS,
	racesFor,
	type GuildFaction
} from '$lib/game/forever';
import { classIconUrls } from './class-icons';
import { DEFAULT_ACCENTS, getBattlenet, getCharter, getGuild, getWowheadTooltips } from './settings';
import { db, schema } from './db';
import { demoEnabled } from './demo';

/** Données transmises au navigateur : jeu Forever + profil public de la guilde. */
export function publicConfig() {
	const guild = getGuild();
	const faction: GuildFaction = guild?.faction ?? 'both';
	return {
		guild: {
			name: guild?.name ?? 'Innkeeper',
			faction,
			serverType: guild?.serverType ?? null,
			tagline: guild?.tagline ?? '',
			accentColor: guild?.accentColor ?? DEFAULT_ACCENTS[faction],
			timezone: guild?.timezone ?? 'Europe/Paris',
			// Le nom du fichier change à chaque envoi : il sert de version contre le cache.
			logoUrl: guild?.logo ? `/logo?v=${guild.logo}` : null,
			bannerUrl: guild?.banner ? `/banniere?v=${guild.banner}` : null,
			bannerTitle: !guild?.banner || (guild?.bannerTitle ?? true)
		},
		// Lien « Charte » dans le menu, seulement quand la guilde en a publié une.
		hasCharter: Boolean(getCharter()),
		// Lien « Addons » dans le menu, seulement quand la guilde en conseille.
		hasAddons: Boolean(db().select({ id: schema.addons.id }).from(schema.addons).limit(1).get()),
		// Bulles Wowhead au survol des liens de recettes (réglage de la guilde).
		wowheadTooltips: getWowheadTooltips(),
		// Vérification des persos dans l'Armurerie (Battle.net connecté par la guilde).
		armory: ((b) => Boolean(b.clientId && b.clientSecret && b.guildSlug))(getBattlenet()),
		// Site de démonstration : bandeau en haut de chaque page.
		demo: demoEnabled(),
		maxLevel: MAX_LEVEL,
		dualSpecLevel: DUAL_SPEC_LEVEL,
		races: racesFor(faction),
		classes: CLASSES,
		// Icônes envoyées par la guilde (Admin → Guilde) ; une classe sans icône garde son blason.
		classIcons: classIconUrls() as Record<string, string>,
		professions: PROFESSIONS
	};
}

export type PublicConfig = ReturnType<typeof publicConfig>;
