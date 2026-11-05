import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { resetBattlenetToken, syncBattlenet } from './battlenet';
import { createCharacter } from './characters';
import { db, schema } from './db';
import { applyImport, planImport } from './game-import';
import { getBattlenetStatus, getGameRanks, getGameRoster, setBattlenet } from './settings';

horde();

const sheet = (userId: string, name: string, surname: string, professions: { id: string; level: number | null }[] = []) =>
	createCharacter(userId, {
		name,
		surname,
		race: 'tauren',
		class: 'shaman',
		spec: 'restoration',
		role: 'healer',
		spec2: null,
		role2: null,
		level: 5,
		professions,
		recipes: null,
		pve: null,
		pvp: null,
		notes: null,
		isMain: true
	});
const character = (id: number) => db().select().from(schema.characters).where(eq(schema.characters.id, id)).get()!;

const NOW = Date.now();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Faux Battle.net : un registre, des fiches, des métiers ; compte les appels. */
function fakeBattlenet(opts: { token?: number; guild?: boolean } = {}) {
	const calls: string[] = [];
	const fetchFn = (async (input: string | URL) => {
		const url = new URL(String(input));
		calls.push(url.pathname);
		if (url.hostname === 'oauth.battle.net') return opts.token ? json({ error: 'invalid_client' }, opts.token) : json({ access_token: 'jeton', expires_in: 86399 });
		expect(url.searchParams.get('namespace')).toBe('profile-forever-eu');
		const path = url.pathname;
		if (path === '/data/wow/guild/le-pacte-des-anciens/roster') {
			if (opts.guild === false) return json({ code: 404 }, 404);
			return json({
				members: [
					{ character: { name: 'Vinshal', surname: 'Haal', slug: 'vinshal-haal', level: 11, playable_class: { id: 7 } }, rank: 1 },
					{ character: { name: 'Dayce', surname: 'Lumen', slug: 'dayce-lumen', level: 9, playable_class: { id: 8 } }, rank: 3 },
					{ character: { name: 'Morta', surname: 'Lafautaupet', slug: 'morta-lafautaupet', level: 1, playable_class: { id: 3 } }, rank: 3 }
				]
			});
		}
		if (path === '/profile/wow/character/vinshal-haal') return json({ last_login_timestamp: NOW - 5 * 3_600_000 });
		if (path === '/profile/wow/character/vinshal-haal/professions')
			return json({
				primaries: [{ profession: { id: 182, name: 'Herboristerie' }, tiers: [{ skill_points: 31 }] }],
				secondaries: [{ profession: { id: 129, name: 'Secourisme' }, tiers: [{ skill_points: 47 }] }]
			});
		if (path === '/profile/wow/character/dayce-lumen') return json({ last_login_timestamp: NOW - 26 * 3_600_000 });
		// Métiers de Dayce indisponibles : on ne touche pas à sa fiche.
		if (path === '/profile/wow/character/dayce-lumen/professions') return json({}, 500);
		return json({ code: 404 }, 404);
	}) as unknown as typeof fetch;
	return { fetchFn, calls };
}

const configure = () => setBattlenet({ clientId: 'c'.repeat(32), clientSecret: 's'.repeat(32), region: 'eu', guildSlug: 'le-pacte-des-anciens' });

describe('synchronisation Battle.net', () => {
	beforeEach(() => resetBattlenetToken());

	it('ne fait rien sans configuration', async () => {
		const { fetchFn, calls } = fakeBattlenet();
		expect((await syncBattlenet(null, fetchFn)).ok).toBe(false);
		expect(calls).toHaveLength(0);
	});

	it('met à jour niveaux, métiers complets et dernière connexion des persos reconnus', async () => {
		configure();
		createUser('v');
		createUser('d');
		// Alchimie abandonnée en jeu : elle quitte la fiche, Battle.net donne la liste complète.
		const vinshal = sheet('v', 'Vinshal', 'Haal', [{ id: 'alchemy', level: 1 }, { id: 'herbalism', level: 10 }]);
		const dayce = sheet('d', 'Dayce', 'Lumen', [{ id: 'enchanting', level: 4 }]);
		const { fetchFn } = fakeBattlenet();

		const result = await syncBattlenet(null, fetchFn);
		expect(result.ok).toBe(true);
		expect(result.message).toContain('3 membres en jeu, 2 persos reconnus');

		const v = character(vinshal.id);
		expect(v.level).toBe(11);
		expect(v.professions).toEqual([
			{ id: 'herbalism', level: 31 },
			{ id: 'first-aid', level: 47 }
		]);
		expect(Math.abs(v.lastOnlineAt!.getTime() - (NOW - 5 * 3_600_000))).toBeLessThan(3_600_000 + 1000);
		const d = character(dayce.id);
		expect(d.level).toBe(9);
		expect(d.professions).toEqual([{ id: 'enchanting', level: 4 }]);

		const roster = getGameRoster()!;
		expect(roster.via).toBe('battlenet');
		expect(roster.roster.map((m) => [m.name, m.class, m.rank])).toEqual([
			['Vinshal Haal', 'SHAMAN', 'Rang 1'],
			['Dayce Lumen', 'MAGE', 'Rang 3'],
			['Morta Lafautaupet', 'HUNTER', 'Rang 3']
		]);
		expect(getBattlenetStatus()).toMatchObject({ ok: true });
		// Morta n'a pas de fiche dans l'Armurerie : pas de date de connexion inventée.
		expect(getGameRoster()!.roster).toHaveLength(3);
	});

	it("ne revient pas en arrière sur un export de l'addon fait depuis la dernière déconnexion", async () => {
		// Vinshal a joué après sa dernière déconnexion (il y a 5 h) : l'addon l'a vu niveau 14 il y a 1 h.
		applyImport(planImport({ format: 1, exportedAt: Math.floor(NOW / 1000) - 3600, roster: [{ name: 'Vinshal Haal', level: 14, rank: 'Officier' }] }));
		const id = db().select().from(schema.characters).where(eq(schema.characters.name, 'Vinshal')).get()!.id;
		expect(character(id).level).toBe(14);
		await syncBattlenet(null, fakeBattlenet().fetchFn);
		expect(character(id).level).toBe(14);
	});

	it("ne date pas la connexion d'un perso absent de l'Armurerie", async () => {
		createUser('m');
		const morta = sheet('m', 'Morta', 'Lafautaupet');
		await syncBattlenet(null, fakeBattlenet().fetchFn);
		expect(character(morta.id).lastOnlineAt).toBeNull();
		expect(character(morta.id).level).toBe(1);
	});

	it("utilise les noms de rangs appris de l'addon", async () => {
		configure();
		// Registre de l'addon, avec le numéro de chaque rang.
		applyImport(
			planImport({
				format: 1,
				exportedAt: Math.floor(NOW / 1000) - 3600,
				roster: [
					{ name: 'Vinshal Haal', level: 10, rank: 'Officier', rankIndex: 1 },
					{ name: 'Dayce Lumen', level: 9, rank: 'Membre', rankIndex: 3 }
				]
			})
		);
		expect(getGameRanks()).toEqual({ '1': 'Officier', '3': 'Membre' });
		await syncBattlenet(null, fakeBattlenet().fetchFn);
		expect(getGameRoster()!.roster.map((m) => m.rank)).toEqual(['Officier', 'Membre', 'Membre']);
	});

	it('explique une clé refusée ou une guilde introuvable', async () => {
		configure();
		const refused = await syncBattlenet(null, fakeBattlenet({ token: 401 }).fetchFn);
		expect(refused).toEqual({ ok: false, message: expect.stringContaining('refuse le Client ID') });
		expect(getBattlenetStatus()).toMatchObject({ ok: false });

		resetBattlenetToken();
		const missing = await syncBattlenet(null, fakeBattlenet({ guild: false }).fetchFn);
		expect(missing.message).toContain('Guilde « le-pacte-des-anciens » introuvable');
	});

});
