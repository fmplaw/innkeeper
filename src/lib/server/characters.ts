import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
	CLASSES,
	DUAL_SPEC_LEVEL,
	MAX_LEVEL,
	MAX_PRIMARY_PROFESSIONS,
	MAX_PROFESSION_LEVEL,
	PROFESSIONS,
	RACES,
	racesFor
} from '$lib/game/forever';
import { INTEREST_LEVELS } from '$lib/interests';
import { getGuild } from './settings';
import { db, schema } from './db';
import type { Character } from './db/schema';
import { ROLES } from '$lib/roles';

const { characters } = schema;

z.config(z.locales.fr());

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((v) => v || null);

function characterSchema() {
	const races = racesFor(getGuild()?.faction ?? 'both');
	const ids = <T extends { id: string }>(list: readonly T[]) => list.map((x) => x.id);

	return z
		.object({
			name: z.string().trim().min(2, 'Nom trop court').max(24),
			// Obligatoire dans WoW Forever : tout perso a un nom de famille.
			surname: z.string().trim().min(2, 'Nom de famille requis (obligatoire dans Forever)').max(24),
			race: z.string().refine((v) => ids(races).includes(v), 'Race requise (dans la faction de la guilde)'),
			class: z.string().refine((v) => ids(CLASSES).includes(v), 'Classe inconnue'),
			spec: optionalText(32),
			role: z.enum(ROLES, 'Rôle invalide'),
			// Double spécialisation (WoW Forever) : spé secondaire facultative.
			spec2: optionalText(32),
			role2: z.preprocess((v) => v || null, z.enum(ROLES, 'Rôle invalide').nullable()),
			isMain: z.boolean(),
			level: z.coerce.number().int().min(1).max(MAX_LEVEL),
			professions: z
				.array(
					z.object({
						id: z.string().refine((p) => ids(PROFESSIONS).includes(p), 'Métier inconnu'),
						level: z.number().int().min(1).max(MAX_PROFESSION_LEVEL, `Niveau de métier maximum : ${MAX_PROFESSION_LEVEL}`).nullable()
					})
				)
				.refine(
					(list) => list.filter((p) => !PROFESSIONS.find((k) => k.id === p.id)?.secondary).length <= MAX_PRIMARY_PROFESSIONS,
					`${MAX_PRIMARY_PROFESSIONS} métiers principaux au maximum`
				),
			recipes: optionalText(500),
			pve: z.preprocess((v) => v || null, z.enum(INTEREST_LEVELS).nullable()),
			pvp: z.preprocess((v) => v || null, z.enum(INTEREST_LEVELS).nullable()),
			notes: optionalText(500),
			// Perso pas encore créé en jeu : introuvable dans l'Armurerie, c'est normal.
			declaredNew: z.boolean().optional()
		})
		.superRefine((c, ctx) => {
			const race = RACES.find((r) => r.id === c.race);
			if (race && !race.classes.includes(c.class))
				ctx.addIssue({ code: 'custom', path: ['class'], message: `Classe non jouable en ${race.name}` });

			const specs = CLASSES.find((k) => k.id === c.class)?.specs ?? [];
			const checkSpec = (specId: string | null, role: string | null, specPath: string, rolePath: string) => {
				if (!specId) return;
				const spec = specs.find((s) => s.id === specId);
				if (!spec) ctx.addIssue({ code: 'custom', path: [specPath], message: 'Spécialisation inconnue pour cette classe' });
				else if (!role) ctx.addIssue({ code: 'custom', path: [rolePath], message: 'Rôle requis' });
				else if (!spec.roles.includes(role as (typeof ROLES)[number]))
					ctx.addIssue({ code: 'custom', path: [rolePath], message: `Rôle incompatible avec ${spec.name}` });
			};
			checkSpec(c.spec, c.role, 'spec', 'role');
			checkSpec(c.spec2, c.role2, 'spec2', 'role2');

			if ((c.spec2 || c.role2) && c.level < DUAL_SPEC_LEVEL)
				ctx.addIssue({
					code: 'custom',
					path: ['spec2'],
					message: `La double spécialisation se débloque au niveau ${DUAL_SPEC_LEVEL}`
				});
		});
}

export type CharacterInput = z.output<ReturnType<typeof characterSchema>>;

/**
 * Nom de perso ou de famille mis en forme : une majuscule, le reste en minuscules,
 * quelle que soit la saisie (« tHRALL » → « Thrall », « éLISE » → « Élise »).
 */
export function nameCase(value: string) {
	const v = value.trim().toLocaleLowerCase('fr');
	return v.charAt(0).toLocaleUpperCase('fr') + v.slice(1);
}

export function parseCharacterForm(form: FormData) {
	const str = (key: string) => String(form.get(key) ?? '');
	const raw = {
		name: nameCase(str('name')),
		surname: nameCase(str('surname')),
		race: str('race'),
		class: str('class'),
		spec: str('spec'),
		role: str('role'),
		spec2: str('spec2'),
		role2: str('role2'),
		isMain: form.get('isMain') === 'on',
		level: str('level'),
		// Niveau de métier : champ `level-<id>` ; un métier coché sans niveau vaut 1.
		professions: form.getAll('professions').map((id) => {
			const level = str(`level-${id}`).trim();
			return { id: String(id), level: level === '' ? 1 : Number(level) };
		}),
		recipes: str('recipes'),
		pve: str('pve'),
		pvp: str('pvp'),
		notes: str('notes'),
		declaredNew: form.get('declaredNew') === 'on'
	};
	const result = characterSchema().safeParse(raw);
	if (result.success) return { data: result.data } as const;

	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) errors[String(issue.path[0] ?? 'form')] ??= issue.message;
	return { errors, values: raw } as const;
}

export function listCharacters(userId?: string) {
	return db()
		.select()
		.from(characters)
		.where(userId ? eq(characters.userId, userId) : undefined)
		.orderBy(desc(characters.isMain), asc(characters.name))
		.all();
}

export function getCharacter(id: number) {
	return db().select().from(characters).where(eq(characters.id, id)).get();
}

export function getMain(userId: string) {
	return db()
		.select()
		.from(characters)
		.where(and(eq(characters.userId, userId), eq(characters.isMain, true)))
		.get();
}

// Règles de rattachement : tout joueur ayant au moins un perso a exactement un
// main (index unique partiel en base), et chaque reroll est rattaché à ce main.
// Le main ne se retire pas ; on en change en promouvant un reroll.

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

// À appeler avant de poser le nouveau main, sinon l'index unique est violé.
function demoteMain(tx: Tx, userId: string) {
	tx.update(characters)
		.set({ isMain: false })
		.where(and(eq(characters.userId, userId), eq(characters.isMain, true)))
		.run();
}

export function createCharacter(userId: string, input: CharacterInput): Character {
	return db().transaction((tx) => {
		const hasMain = tx
			.select({ id: characters.id })
			.from(characters)
			.where(and(eq(characters.userId, userId), eq(characters.isMain, true)))
			.get();
		// Le premier perso d'un joueur devient forcément son main.
		const isMain = input.isMain || !hasMain;
		if (isMain) demoteMain(tx, userId);
		const interestsUpdatedAt = input.pve || input.pvp ? new Date() : null;
		return tx.insert(characters).values({ ...input, isMain, userId, interestsUpdatedAt }).returning().get();
	});
}

export function updateCharacter(existing: Character, input: CharacterInput) {
	const promote = input.isMain && !existing.isMain;
	// La date des intérêts ne bouge que s'ils changent : elle dit aux officiers s'ils sont à jour.
	const interestsChanged = input.pve !== existing.pve || input.pvp !== existing.pvp;
	// Nom ou classe changés : la vérification dans l'Armurerie est à refaire.
	const identityChanged = input.name !== existing.name || input.surname !== existing.surname || input.class !== existing.class;
	db().transaction((tx) => {
		if (promote) demoteMain(tx, existing.userId);
		tx.update(characters)
			.set({
				...input,
				isMain: existing.isMain || promote,
				updatedAt: sql`(unixepoch())`,
				...(interestsChanged && { interestsUpdatedAt: new Date() }),
				...(identityChanged && { armoryStatus: null, armoryCheckedAt: null })
			})
			.where(eq(characters.id, existing.id))
			.run();
	});
}

export function setMain(character: Character) {
	if (character.isMain) return;
	db().transaction((tx) => {
		demoteMain(tx, character.userId);
		tx.update(characters).set({ isMain: true }).where(eq(characters.id, character.id)).run();
	});
}

/** Renvoie un message d'erreur si la suppression laisserait des rerolls sans main. */
export function deleteCharacter(character: Character): string | null {
	if (character.isMain) {
		const reroll = db()
			.select({ id: characters.id })
			.from(characters)
			.where(and(eq(characters.userId, character.userId), ne(characters.id, character.id)))
			.get();
		if (reroll) return `${character.name} est le main : désigne d’abord un autre main parmi les rerolls.`;
	}
	db().delete(characters).where(eq(characters.id, character.id)).run();
	return null;
}

/** Description d'un perso pour le journal d'audit : « Thrall (joueur : Untel) ». */
export function characterTarget(c: Character) {
	const owner = db().select({ name: schema.users.displayName }).from(schema.users).where(eq(schema.users.discordId, c.userId)).get();
	return { label: `${c.name} (joueur : ${owner?.name ?? c.userId})`, url: `/persos/${c.id}` };
}

// Champs comparés dans le journal quand un officier modifie la fiche d'un autre joueur.
export const AUDITED_CHARACTER_FIELDS = [
	'name', 'surname', 'race', 'class', 'spec', 'role', 'spec2', 'role2', 'level', 'professions', 'recipes', 'pve', 'pvp', 'notes'
];

/** Un joueur gère ses propres persos ; un officier ou l'admin local gère ceux de tout le monde. */
export function canEdit(locals: App.Locals, character: Character) {
	if (locals.admin || locals.user?.permission === 'officer') return true;
	return character.userId === locals.user?.id;
}
