import type { Cookies } from '@sveltejs/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { guildMember, listMembers } from '../bot';
import { db, schema } from '../db';
import { listCharacters } from '../characters';
import { createEvent, fetchEvent, listUpcoming } from '../raidhelper';
import { getDemoMarker, getGuild } from '../settings';
import { demoSessionUser, enterDemo, initDemo, leaveDemo } from '.';
import { demoUserId } from './seed';

// Faux cookies : assez pour enterDemo / leaveDemo / sessionAdmin.
function cookieJar() {
	const jar = new Map<string, string>();
	return {
		jar,
		cookies: { get: (k: string) => jar.get(k), set: (k: string, v: string) => void jar.set(k, v), delete: (k: string) => void jar.delete(k) } as unknown as Cookies
	};
}

describe('mode démo', () => {
	const realFetch = globalThis.fetch;
	beforeAll(() => initDemo());
	afterAll(() => {
		globalThis.fetch = realFetch;
	});

	it('remplit une base vide avec la guilde fictive, et la marque comme base de démo', () => {
		expect(getGuild()?.name).toBe('Les Gardiens de l’Aube');
		expect(getDemoMarker()).not.toBeNull();
		expect(listCharacters(demoUserId('Aldren')).map((c) => c.name)).toEqual(['Aldren', 'Mirabel']);
		expect(db().select().from(schema.applications).all()).toHaveLength(2);
		// Une seconde initialisation (redémarrage) ne remplit pas deux fois.
		initDemo();
		expect(db().select().from(schema.users).all()).toHaveLength(18);
	});

	it('simule Discord à partir de la base de démo', async () => {
		expect((await guildMember(demoUserId('Pipwick')))?.roles).toContain('700000000000000002');
		// Un candidat n'est pas sur le serveur.
		expect(await guildMember(demoUserId('Aelith'))).toBeNull();
		expect((await listMembers()).length).toBe(16);
	});

	it('simule Raid-Helper : sorties lues, créées et corrigées', async () => {
		const upcoming = await listUpcoming('900000000000000001', 'demo-raidhelper-key');
		expect(upcoming.map((e) => e.title)).toContain('Soirée donjon : Les Mortemines');
		expect((await fetchEvent('910000000000000001'))?.signUps.length).toBe(7);
		const startTime = Math.floor(Date.now() / 1000) + 86_400;
		const id = await createEvent('900000000000000001', 'demo-raidhelper-key', {
			channelId: '900000000000000010',
			leaderId: demoUserId('Aldren'),
			templateId: 'wowforever',
			title: 'Essai',
			description: '',
			date: '01-01-2030',
			time: '21:00',
			startTime
		});
		// La simulation ne lit pas la date en texte : le site la corrige avec l'heure exacte.
		const created = await (await globalThis.fetch(`https://raid-helper.dev/api/v4/events/${id}`)).json();
		expect(created).toMatchObject({ title: 'Essai', startTime, leaderName: 'Aldren' });
	});

	it('ne laisse sortir aucun appel vers l’extérieur', async () => {
		expect((await globalThis.fetch('https://exemple.fr/')).status).toBe(503);
	});

	it('connexion par choix de profil', () => {
		const { jar, cookies } = cookieJar();
		expect(enterDemo(cookies, 'inconnu', false)).toBe(false);
		expect(enterDemo(cookies, 'member', false)).toBe(true);
		expect(demoSessionUser(cookies)).toBe(demoUserId('Pipwick'));
		expect(enterDemo(cookies, 'admin', false)).toBe(true);
		expect(demoSessionUser(cookies)).toBeNull();
		expect(jar.has('admin_session')).toBe(true);
		leaveDemo(cookies);
		expect(jar.size).toBe(0);
	});
});
