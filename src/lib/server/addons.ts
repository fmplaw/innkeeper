import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ADDON_IMPORTANCES, ADDON_USAGES } from '$lib/addons';
import { CLASSES } from '$lib/game/forever';
import { ROLES } from '$lib/roles';
import { db, schema } from './db';
import type { Addon } from './db/schema';

// Addons conseillés par la guilde : saisis par les officiers, affichés sur la page « Addons ».

const { addons } = schema;

// Champs facultatifs : vides ou absents deviennent null.
const text = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullish()
		.transform((v) => v || null);

/** Lien facultatif en https, éventuellement limité à un site (CurseForge, Wago). */
const link = (hosts: string[] | null, label: string) =>
	z
		.string()
		.trim()
		.max(300)
		.nullish()
		.transform((v) => v || null)
		.refine((v) => {
			if (!v) return true;
			// Lien vers une page du site lui-même (le zip de l'addon, par exemple).
			if (!hosts && /^\/[\w./-]*$/.test(v)) return true;
			try {
				const url = new URL(v);
				return url.protocol === 'https:' && (!hosts || hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`)));
			} catch {
				return false;
			}
		}, label);

export const addonSchema = z.object({
	name: z.string().trim().min(2, 'Nom trop court').max(60),
	importance: z.enum(ADDON_IMPORTANCES, 'Importance inconnue'),
	usage: z.enum(ADDON_USAGES, 'Usage inconnu'),
	classes: z.array(z.string().refine((c) => CLASSES.some((k) => k.id === c), 'Classe inconnue')),
	roles: z.array(z.enum(ROLES)),
	description: text(500),
	curseforgeUrl: link(['curseforge.com'], 'Lien CurseForge attendu (https://www.curseforge.com/…)'),
	wagoUrl: link(['wago.io'], 'Lien Wago attendu (https://addons.wago.io/…)'),
	otherUrl: link(null, 'Lien attendu en https:// (ou une page du site, /…)')
});
export type AddonInput = z.output<typeof addonSchema>;

export function parseAddonForm(form: FormData) {
	return addonSchema.safeParse({
		name: form.get('name') ?? '',
		importance: form.get('importance'),
		usage: form.get('usage'),
		classes: form.getAll('classes').map(String),
		roles: form.getAll('roles').map(String),
		description: form.get('description') ?? '',
		curseforgeUrl: form.get('curseforgeUrl') ?? '',
		wagoUrl: form.get('wagoUrl') ?? '',
		otherUrl: form.get('otherUrl') ?? ''
	});
}

/** Du plus important au confort, puis dans l'ordre choisi par les officiers. */
export function listAddons(): Addon[] {
	const rank = (a: Addon) => ADDON_IMPORTANCES.indexOf(a.importance);
	return db()
		.select()
		.from(addons)
		.all()
		.sort((a, b) => rank(a) - rank(b) || a.position - b.position || a.name.localeCompare(b.name, 'fr'));
}

export const getAddon = (id: number) => db().select().from(addons).where(eq(addons.id, id)).get();

const nextPosition = (importance: Addon['importance']) =>
	Math.max(-1, ...listAddons().filter((a) => a.importance === importance).map((a) => a.position)) + 1;

export function createAddon(values: AddonInput) {
	return db()
		.insert(addons)
		.values({ ...values, position: nextPosition(values.importance) })
		.returning()
		.get();
}

export function updateAddon(id: number, values: AddonInput) {
	const before = getAddon(id);
	if (!before) return undefined;
	// Changement d'importance : l'addon passe à la fin de son nouveau groupe.
	const position = before.importance === values.importance ? before.position : nextPosition(values.importance);
	return db()
		.update(addons)
		.set({ ...values, position, updatedAt: new Date() })
		.where(eq(addons.id, id))
		.returning()
		.get();
}

export const deleteAddon = (id: number) => db().delete(addons).where(eq(addons.id, id)).run().changes > 0;

/** Monte ou descend un addon dans son groupe d'importance (les positions sont renumérotées). */
export function moveAddon(id: number, direction: 'up' | 'down') {
	const addon = getAddon(id);
	if (!addon) return;
	const group = listAddons().filter((a) => a.importance === addon.importance);
	const from = group.findIndex((a) => a.id === id);
	const to = direction === 'up' ? from - 1 : from + 1;
	if (to < 0 || to >= group.length) return;
	[group[from], group[to]] = [group[to], group[from]];
	db().transaction((tx) => {
		group.forEach((a, position) => tx.update(addons).set({ position }).where(eq(addons.id, a.id)).run());
	});
}

/** L'addon d'Innkeeper, proposé en un clic : même page pour toutes les guildes. */
export const INNKEEPER_SYNC: AddonInput = {
	name: 'Innkeeper Sync',
	importance: 'essential',
	usage: 'guild',
	classes: [],
	roles: [],
	description:
		'Évite de tout saisir à la main sur le site : l’addon relève ton niveau, tes métiers et tes recettes, ainsi que le registre de la guilde. Couplé à l’application InnkeeperSync pour Windows (Mes persos → Synchronisation automatique), tout se met à jour tout seul à chaque déconnexion. Sans l’application : /innkeeper puis /reload, et un officier dépose le fichier.',
	curseforgeUrl: 'https://www.curseforge.com/projects/1777916',
	wagoUrl: null,
	otherUrl: '/addon/InnkeeperSync.zip'
};
