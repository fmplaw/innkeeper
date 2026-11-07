import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asMember, createUser, horde } from '../../test/helpers';
import { artisansByProfession } from './artisans';
import { createCharacter } from './characters';
import { db, schema } from './db';
import { CONFIRM_AFTER_MS, detectDepartures, guildKey, listDepartures, markLeft, reinstate, setLeftComment, unseenDepartures } from './departures';
import { getPlayer } from './players';
import { permissionFor, recordSeenRoles, updateRole } from './permissions';
import { recruitmentSchema, setDiscord, setRecruitment } from './settings';
import { publicStats } from './stats';

horde();

const MEMBER_ROLE = '500000000000000001';
const FORMER_ROLE = '500000000000000002';
recordSeenRoles([MEMBER_ROLE, FORMER_ROLE]);
updateRole(MEMBER_ROLE, { label: 'Vétéran', permission: 'member' });
updateRole(FORMER_ROLE, { label: 'Éclaireur', permission: 'none' });

const sheet = (userId: string, name: string, seen = true) => {
	const c = createCharacter(userId, {
		name,
		surname: 'Test',
		race: 'orc',
		class: 'shaman',
		spec: 'restoration',
		role: 'healer',
		spec2: null,
		role2: null,
		level: 20,
		professions: [{ id: 'alchemy', level: 100 }],
		recipes: null,
		pve: null,
		pvp: null,
		notes: null,
		isMain: true
	});
	if (seen) db().update(schema.characters).set({ gameSyncedAt: new Date() }).where(eq(schema.characters.id, c.id)).run();
	return c;
};
const user = (id: string) => db().select().from(schema.users).where(eq(schema.users.discordId, id)).get()!;
const elsewhere = async () => ({ status: 'found' as const, guild: 'Les Copains' });
const HOUR = 3_600_000;

describe('départs de la guilde', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('reconnaît le nom de la guilde dans l’Armurerie', () => {
		expect(guildKey('Le Pacte des Anciens')).toBe('le-pacte-des-anciens');
		expect(guildKey('L’Aube Écarlate')).toBe('l-aube-ecarlate');
	});

	it('soupçonne, puis confirme après 5 h si l’Armurerie montre une autre guilde', async () => {
		createUser('100000000000000001', [MEMBER_ROLE]);
		createUser('100000000000000002', [MEMBER_ROLE]);
		const gone = sheet('100000000000000001', 'Partant');
		const here = sheet('100000000000000002', 'Fidele');
		const t0 = new Date('2026-11-07T10:00:00Z');

		let r = await detectDepartures(new Set([here.id]), 2, elsewhere, t0);
		expect(r.suspected).toEqual(['Joueur 100000000000000001']);
		expect(user('100000000000000001').leftAt).toBeNull();

		// Trop tôt : rien de confirmé.
		r = await detectDepartures(new Set([here.id]), 2, elsewhere, new Date(t0.getTime() + 3 * HOUR));
		expect(r.left).toEqual([]);

		r = await detectDepartures(new Set([here.id]), 2, elsewhere, new Date(t0.getTime() + CONFIRM_AFTER_MS + HOUR));
		expect(r.left).toEqual(['Joueur 100000000000000001']);
		const u = user('100000000000000001');
		expect(u.leftAt).not.toBeNull();
		expect(u.leftBy).toBe('Battle.net');
		expect(u.leftForGuild).toBe('Les Copains');
		expect(permissionFor(u)).toBeNull();
		expect(unseenDepartures()).toBe(1);
		expect(user('100000000000000002').absentSince).toBeNull();

		// Masqué des membres : artisans, statistiques, page joueur ; visible des officiers.
		expect(artisansByProfession().find((p) => p.id === 'alchemy')?.artisans.map((a) => a.characterId)).toEqual([here.id]);
		expect(publicStats().mains).toBe(1);
		expect(getPlayer('100000000000000001', false)).toBeNull();
		expect(getPlayer('100000000000000001', true)?.officerInfo?.leftAt).not.toBeNull();
		expect(listDepartures().former.map((f) => f.characters[0].id)).toEqual([gone.id]);

		// Commentaire : le départ est vu.
		setLeftComment('100000000000000001', 'Rejoint des amis', asMember('100000000000000002', 'officer'));
		expect(unseenDepartures()).toBe(0);
		expect(user('100000000000000001').leftComment).toBe('Rejoint des amis');

		// Retour dans la guilde en jeu : réintégré tout seul.
		r = await detectDepartures(new Set([here.id, gone.id]), 2, elsewhere, new Date(t0.getTime() + 10 * HOUR));
		expect(r.returned).toEqual(['Joueur 100000000000000001']);
		expect(user('100000000000000001').leftAt).toBeNull();
	});

	it('ne confirme pas sans preuve : introuvable, encore dans la guilde, officier, ou jamais vu en jeu', async () => {
		createUser('100000000000000003', [MEMBER_ROLE]);
		createUser('100000000000000004', [MEMBER_ROLE], { instanceAdmin: true });
		createUser('100000000000000005', [MEMBER_ROLE]);
		createUser('100000000000000006', [MEMBER_ROLE]);
		sheet('100000000000000003', 'Renomme');
		sheet('100000000000000004', 'Chef');
		sheet('100000000000000005', 'Pasencore', false);
		sheet('100000000000000006', 'Retard');
		const lookup = async (name: string) =>
			name === 'Renomme' ? { status: 'missing' as const } : name === 'Retard' ? { status: 'found' as const, guild: 'La Horde de Test' } : elsewhere();
		const t0 = new Date('2026-11-08T10:00:00Z');
		// Les persos du test précédent (1 et 2) sont dans le registre.
		const seen = new Set([1, 2]);
		await detectDepartures(seen, 5, lookup, t0);
		const r = await detectDepartures(seen, 5, lookup, new Date(t0.getTime() + 6 * HOUR));
		expect(r.left).toEqual([]);
		const suspects = listDepartures().suspects.map((s) => s.id);
		expect(suspects).toContain('100000000000000003');
		expect(suspects).toContain('100000000000000004');
		expect(suspects).toContain('100000000000000006');
		expect(suspects).not.toContain('100000000000000005');
		// Registre vide (Battle.net en panne) : personne n'est soupçonné.
		expect(await detectDepartures(new Set(), 0, lookup)).toEqual({ suspected: [], left: [], returned: [] });
	});

	it('départ noté par un officier : le bot retire les rôles de membre et donne le rôle choisi', async () => {
		setDiscord({ clientId: '111111111111111111', clientSecret: 'secret-secret-123', guildId: '222222222222222222', botToken: 'b' });
		setRecruitment(recruitmentSchema.parse({ demoteFormer: true, formerRoleId: FORMER_ROLE }));
		createUser('100000000000000007', [MEMBER_ROLE]);
		sheet('100000000000000007', 'Ami');
		const calls: string[] = [];
		vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
			calls.push(`${init?.method ?? 'GET'} ${url.replace('https://discord.com/api/v10/guilds/222222222222222222', '')}`);
			if (!init?.method) return Response.json({ nick: null, roles: [MEMBER_ROLE, '999'] });
			return new Response(null, { status: 204 });
		});
		const officer = asMember('100000000000000002', 'officer');
		const u = await markLeft('100000000000000007', officer, { by: 'Joueur 100000000000000002', comment: 'Part avec des copains' });
		expect(u).not.toBeNull();
		expect(calls).toEqual([
			'GET /members/100000000000000007',
			`DELETE /members/100000000000000007/roles/${MEMBER_ROLE}`,
			`PUT /members/100000000000000007/roles/${FORMER_ROLE}`
		]);
		const saved = user('100000000000000007');
		expect(saved.leftDiscord).toContain('Vétéran');
		expect(saved.leftDiscord).toContain('Éclaireur');
		expect(saved.leftComment).toBe('Part avec des copains');
		// Noté par un officier : déjà vu.
		expect(saved.leftSeenAt).not.toBeNull();
		// Un départ noté à la main ne se défait pas tout seul ; « Réintégrer » le fait.
		expect(reinstate('100000000000000007', officer)?.displayName).toBe('Joueur 100000000000000007');
		expect(user('100000000000000007').leftAt).toBeNull();
	});
});
