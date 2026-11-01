// Page « Addons » : ce que la guilde conseille. Libellés partagés entre serveur et navigateur.

export const ADDON_IMPORTANCES = ['essential', 'raid', 'recommended', 'useful', 'comfort'] as const;
export type AddonImportance = (typeof ADDON_IMPORTANCES)[number];

export const IMPORTANCE_INFO: Record<AddonImportance, { label: string; hint: string }> = {
	essential: { label: 'Indispensable', hint: 'À installer par tous les membres.' },
	raid: { label: 'Recommandé en raid', hint: 'Fortement conseillé pour les raids et les sorties de haut niveau.' },
	recommended: { label: 'Recommandé', hint: 'Vraiment utile, sans obligation.' },
	useful: { label: 'Utile', hint: 'Bon à avoir selon ce que tu fais en jeu.' },
	comfort: { label: 'Confort', hint: 'Selon les goûts de chacun.' }
};

export const ADDON_USAGES = ['guild', 'quests', 'dungeons', 'professions', 'interface', 'pvp', 'other'] as const;
export type AddonUsage = (typeof ADDON_USAGES)[number];

export const USAGE_LABELS: Record<AddonUsage, string> = {
	guild: 'Guilde',
	quests: 'Quêtes et montée de niveau',
	dungeons: 'Donjons et raids',
	professions: 'Métiers et économie',
	interface: 'Interface et confort',
	pvp: 'JcJ',
	other: 'Divers'
};
