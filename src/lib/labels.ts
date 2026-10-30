import { RACES } from '$lib/game/forever';
import { ROLE_LABELS, type Role } from '$lib/roles';
import type { PublicConfig } from '$lib/server/config';

export function className(config: PublicConfig, id: string) {
	return config.classes.find((c) => c.id === id)?.name ?? id;
}

export function classColor(config: PublicConfig, id: string) {
	return config.classes.find((c) => c.id === id)?.color ?? 'inherit';
}

export function specName(config: PublicConfig, classId: string, specId: string | null) {
	if (!specId) return '';
	return config.classes.find((c) => c.id === classId)?.specs.find((s) => s.id === specId)?.name ?? specId;
}

/** « Restauration (Soigneur) », ou seulement le rôle si la spé n'est pas renseignée. */
export function specRole(config: PublicConfig, classId: string, specId: string | null, role: Role | null) {
	const spec = specName(config, classId, specId);
	const roleLabel = role ? ROLE_LABELS[role] : '';
	return spec && roleLabel ? `${spec} (${roleLabel})` : spec || roleLabel;
}

// Toutes les races du jeu, pas seulement celles de la faction actuelle de la guilde.
export function raceName(_config: PublicConfig, id: string | null) {
	if (!id) return '';
	return RACES.find((r) => r.id === id)?.name ?? id;
}

/** « Alchimie 275, Herboristerie » : niveau affiché quand il est renseigné. */
export function professionNames(config: PublicConfig, list: { id: string; level: number | null }[]) {
	return list
		.map((p) => {
			const name = config.professions.find((k) => k.id === p.id)?.name ?? p.id;
			return p.level ? `${name} ${p.level}` : name;
		})
		.join(', ');
}

export function fullName(c: { name: string; surname: string | null }) {
	return c.surname ? `${c.name} ${c.surname}` : c.name;
}
