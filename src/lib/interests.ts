// Ce qui intéresse le joueur sur un perso, sur deux axes. Modifiable à tout moment.

export const INTEREST_AXES = ['pve', 'pvp'] as const;
export type InterestAxis = (typeof INTEREST_AXES)[number];

export const INTEREST_LEVELS = ['casual', 'competitive'] as const;
export type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const AXIS_LABELS: Record<InterestAxis, string> = { pve: 'PvE', pvp: 'PvP' };
export const LEVEL_LABELS: Record<InterestLevel, string> = { casual: 'Détente', competitive: 'Compétitif' };
