import { describe, expect, it } from 'vitest';
import { formData } from '../../test/helpers';
import { addonSchema, createAddon, deleteAddon, INNKEEPER_SYNC, listAddons, moveAddon, parseAddonForm, updateAddon } from './addons';

const base = { name: 'Questie', importance: 'recommended', usage: 'quests', classes: [], roles: [], description: '', curseforgeUrl: '', wagoUrl: '', otherUrl: '' };

describe('addons conseillés', () => {
	it('lit le formulaire : public, liens et description facultatifs', () => {
		const parsed = parseAddonForm(
			formData({ name: ' EasyMarks ', importance: 'recommended', usage: 'dungeons', roles: 'tank', classes: ['warrior', 'druid'], curseforgeUrl: 'https://www.curseforge.com/wow/addons/x' })
		);
		expect(parsed.data).toMatchObject({ name: 'EasyMarks', roles: ['tank'], classes: ['warrior', 'druid'], description: null, wagoUrl: null });
	});

	it('refuse un lien qui ne mène pas au bon site, ou pas en https', () => {
		expect(addonSchema.safeParse({ ...base, curseforgeUrl: 'https://addons.wago.io/addons/x' }).success).toBe(false);
		expect(addonSchema.safeParse({ ...base, wagoUrl: 'https://addons.wago.io/addons/x' }).success).toBe(true);
		expect(addonSchema.safeParse({ ...base, otherUrl: 'http://exemple.fr' }).success).toBe(false);
		expect(addonSchema.safeParse({ ...base, otherUrl: 'javascript:alert(1)' }).success).toBe(false);
		expect(addonSchema.safeParse({ ...base, otherUrl: '/addon/InnkeeperSync.zip' }).success).toBe(true);
		expect(addonSchema.safeParse({ ...base, classes: ['barde'] }).success).toBe(false);
		expect(addonSchema.safeParse(INNKEEPER_SYNC).success).toBe(true);
	});

	it('classe par importance puis dans l’ordre choisi, et se réordonne', () => {
		const parse = (v: Record<string, unknown>) => addonSchema.parse({ ...base, ...v });
		const auctionator = createAddon(parse({ name: 'Auctionator', usage: 'professions' }));
		createAddon(parse({ name: 'Questie' }));
		const dbm = createAddon(parse({ name: 'DBM', importance: 'raid', usage: 'dungeons' }));
		createAddon(parse({ name: 'Innkeeper Sync', importance: 'essential', usage: 'guild' }));
		expect(listAddons().map((a) => a.name)).toEqual(['Innkeeper Sync', 'DBM', 'Auctionator', 'Questie']);

		moveAddon(auctionator.id, 'down');
		expect(listAddons().map((a) => a.name)).toEqual(['Innkeeper Sync', 'DBM', 'Questie', 'Auctionator']);
		moveAddon(auctionator.id, 'down'); // déjà dernier de son groupe : rien ne bouge
		expect(listAddons().at(-1)?.name).toBe('Auctionator');

		// Passé en « recommandé », DBM arrive à la fin de ce groupe.
		updateAddon(dbm.id, parse({ name: 'DBM', usage: 'dungeons' }));
		expect(listAddons().map((a) => a.name)).toEqual(['Innkeeper Sync', 'Questie', 'Auctionator', 'DBM']);
		expect(deleteAddon(dbm.id)).toBe(true);
		expect(listAddons()).toHaveLength(3);
	});
});
