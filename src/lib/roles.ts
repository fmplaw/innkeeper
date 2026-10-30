export const ROLES = ['tank', 'healer', 'melee', 'ranged'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
	tank: 'Tank',
	healer: 'Soigneur',
	melee: 'Mêlée',
	ranged: 'Distance'
};
