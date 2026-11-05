import { eq } from 'drizzle-orm';
import { PROFESSIONS } from '$lib/game/forever';
import { db, schema } from './db';

// Page Artisans : les persos de la guilde regroupés par métier, avec leur niveau (fiche ou
// jeu) et les recettes exportées par l'addon. Un métier connu seulement par ses recettes
// (fiche pas encore à jour) compte aussi.

export interface Artisan {
	characterId: number;
	name: string;
	surname: string | null;
	class: string;
	role: string;
	isMain: boolean;
	player: string;
	playerId: string;
	skill: number | null;
	recipes: { id: number; name: string }[];
}

export function artisansByProfession() {
	const rows = db()
		.select({ c: schema.characters, player: schema.users.displayName })
		.from(schema.characters)
		.innerJoin(schema.users, eq(schema.users.discordId, schema.characters.userId))
		.all();
	const byProfession = new Map<string, Artisan[]>();
	for (const { c, player } of rows) {
		const ids = new Set([...c.professions.map((p) => p.id), ...(c.knownRecipes ?? []).map((k) => k.profession)]);
		for (const id of ids) {
			if (!PROFESSIONS.some((p) => p.id === id)) continue;
			const known = c.knownRecipes?.find((k) => k.profession === id);
			const level = c.professions.find((p) => p.id === id)?.level ?? null;
			const list = byProfession.get(id) ?? [];
			list.push({
				characterId: c.id,
				name: c.name,
				surname: c.surname,
				class: c.class,
				role: c.role,
				isMain: c.isMain,
				player,
				playerId: c.userId,
				skill: Math.max(level ?? 0, known?.skill ?? 0) || null,
				recipes: known?.recipes ?? []
			});
			byProfession.set(id, list);
		}
	}
	// Métiers dans l'ordre du jeu ; artisans du plus haut niveau au plus bas.
	return PROFESSIONS.filter((p) => byProfession.has(p.id)).map((p) => ({
		id: p.id,
		artisans: byProfession.get(p.id)!.sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0) || b.recipes.length - a.recipes.length || a.name.localeCompare(b.name, 'fr'))
	}));
}
