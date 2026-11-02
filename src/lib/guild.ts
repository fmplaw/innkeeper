// Profil de guilde : constantes partagées entre serveur et navigateur.

export const AMBITIONS = ['pve', 'pvp', 'rp', 'casual', 'hardcore'] as const;
export type Ambition = (typeof AMBITIONS)[number];

export const AMBITION_LABELS: Record<Ambition, string> = {
	pve: 'Raids et donjons (JcE)',
	pvp: 'Champs de bataille et JcJ',
	rp: 'Jeu de rôle',
	casual: 'Ambiance détendue',
	hardcore: 'Progression exigeante'
};

export const AMBITION_ICONS = {
	pve: 'swords',
	pvp: 'shield',
	rp: 'drama',
	casual: 'beer',
	hardcore: 'flame'
} as const satisfies Record<Ambition, string>;

/** Couleur d'accent par défaut selon la faction de la guilde. */
export const DEFAULT_ACCENTS = { horde: '#b3261e', alliance: '#2f6fd6', both: '#8a5cd0' } as const;
