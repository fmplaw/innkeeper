import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { lookupCharacter, resetArmoryCache, resetBattlenetToken, syncBattlenet, verifyCharacter } from './battlenet';
import { createCharacter, updateCharacter } from './characters';
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
		const profile = (name: string, surname: string, level: number, cls: number, race: number, last: number, guild?: string) =>
			json({ name, surname, level, character_class: { id: cls }, race: { id: race }, last_login_timestamp: last, ...(guild && { guild: { name: guild } }) });
		if (path === '/profile/wow/character/vinshal-haal') return profile('Vinshal', 'Haal', 11, 7, 6, NOW - 5 * 3_600_000, 'Le Pacte des Anciens');
		if (path === '/profile/wow/character/vinshal-haal/professions')
			return json({
				primaries: [{ profession: { id: 182, name: 'Herboristerie' }, tiers: [{ skill_points: 31 }] }],
				secondaries: [{ profession: { id: 129, name: 'Secourisme' }, tiers: [{ skill_points: 47 }] }]
			});
		if (path === '/profile/wow/character/dayce-lumen') return profile('Dayce', 'Lumen', 9, 8, 8, NOW - 26 * 3_600_000, 'Le Pacte des Anciens');
		// Hors de la guilde : une recrue qui a déjà son perso, et un perso saisi avec la mauvaise classe.
		if (path === '/profile/wow/character/nova-etoile') return profile('Nova', 'Etoile', 24, 11, 6, NOW - 3_600_000);
		if (path === '/profile/wow/character/nova-etoile/professions')
			return json({ primaries: [{ profession: { id: 182 }, tiers: [{ skill_points: 120 }] }], secondaries: [] });
		if (path === '/profile/wow/character/brak-dur') return profile('Brak', 'Dur', 30, 1, 2, NOW - 3_600_000);
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


	it("cherche un perso dans l'Armurerie, et garde la réponse 10 minutes", async () => {
		resetArmoryCache();
		const { fetchFn, calls } = fakeBattlenet();
		expect(await lookupCharacter('Nova', 'Etoile', fetchFn)).toEqual({
			status: 'found',
			name: 'Nova',
			surname: 'Etoile',
			level: 24,
			classId: 'druid',
			raceId: 'tauren',
			guild: null,
			professions: [{ id: 'herbalism', level: 120 }]
		});
		const asked = calls.length;
		await lookupCharacter('nova', 'ETOILE', fetchFn);
		expect(calls).toHaveLength(asked);
		expect(await lookupCharacter('Ghost', 'Inconnu', fetchFn)).toEqual({ status: 'missing' });
		// Battle.net en panne : « indisponible », jamais « introuvable ».
		resetArmoryCache();
		resetBattlenetToken();
		expect(await lookupCharacter('Nova', 'Etoile', fakeBattlenet({ token: 500 }).fetchFn)).toEqual({ status: 'unavailable' });
	});

	it('vérifie une fiche : trouvée, autre classe, introuvable, revérifiée après un changement de nom', async () => {
		resetArmoryCache();
		const { fetchFn } = fakeBattlenet();
		createUser('n');
		const nova = sheet('n', 'Nova', 'Etoile');
		expect(await verifyCharacter(nova.id, fetchFn)).toBe('mismatch');
		const druid = {
			name: 'Nova',
			surname: 'Etoile',
			race: 'tauren',
			class: 'druid',
			spec: 'restoration',
			role: 'healer' as const,
			spec2: null,
			role2: null,
			level: 24,
			professions: [],
			recipes: null,
			pve: null,
			pvp: null,
			notes: null,
			isMain: true,
			declaredNew: false
		};
		updateCharacter(nova, druid);
		expect(character(nova.id).armoryStatus).toBeNull();
		expect(await verifyCharacter(nova.id, fetchFn)).toBe('found');

		createUser('g');
		const ghost = createCharacter('g', { ...druid, name: 'Ghost', surname: 'Inconnu', declaredNew: true });
		expect(await verifyCharacter(ghost.id, fetchFn)).toBe('missing');
		expect(character(ghost.id).declaredNew).toBe(true);
	});

	it('la synchronisation vérifie les persos du registre et revoit les autres', async () => {
		resetArmoryCache();
		createUser('b');
		const brak = sheet('b', 'Brak', 'Dur');
		await syncBattlenet(null, fakeBattlenet().fetchFn);
		const vinshal = db().select().from(schema.characters).where(eq(schema.characters.name, 'Vinshal')).get()!;
		// Dans le registre, même classe : vérifié sans appel de plus.
		expect(vinshal.armoryStatus).toBe('found');
		// Hors registre : cherché dans l'Armurerie, guerrier en jeu et chaman sur la fiche.
		expect(character(brak.id).armoryStatus).toBe('mismatch');
		expect(character(brak.id).armoryCheckedAt).not.toBeNull();
	});
});
