export const ROLES = ['tank', 'healer', 'melee', 'ranged'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
	tank: 'Tank',
	healer: 'Soigneur',
	melee: 'Mêlée',
	ranged: 'Distance'
};

/** Icône de chaque rôle (voir Glyph.svelte) : un rôle se lit toujours avec son icône et son libellé. */
export const ROLE_ICONS = { tank: 'shield', healer: 'cross', melee: 'swords', ranged: 'crosshair' } as const;
