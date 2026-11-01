import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db, schema } from './db';
import { listRoles, permissionFor, recordDiscordLogin, recordSeenRoles, updateRole } from './permissions';
import { createUser } from '../../test/helpers';
import { setAccess } from './settings';

const OFFICER = '900000000000000001';
const MEMBER = '900000000000000005';
const GUEST = '900000000000000006';

// Membre du serveur de la guilde portant ces rôles.
const onServer = (roles: string[]) => ({ roles, inGuild: true });

describe('permissions selon les rôles Discord', () => {
	it('découvre les rôles des membres qui se connectent, sans permission par défaut', () => {
		recordSeenRoles([OFFICER, MEMBER, GUEST]);
		expect(listRoles().map((r) => r.id).sort()).toEqual([OFFICER, MEMBER, GUEST].sort());
		expect(listRoles().every((r) => r.permission === 'none')).toBe(true);
	});

	it('mode « tout membre du serveur » : tout le monde est membre, les officiers sont désignés par rôle', () => {
		setAccess({ mode: 'all-members' });
		updateRole(OFFICER, { label: 'Chef de Guerre', permission: 'officer' });
		expect(permissionFor(onServer([GUEST]))).toBe('member');
		expect(permissionFor(onServer([]))).toBe('member');
		expect(permissionFor(onServer([GUEST, OFFICER]))).toBe('officer');
	});

	it('mode « rôles désignés » : sans rôle Membre ou Officier, pas d’accès (les Éclaireurs restent dehors)', () => {
		setAccess({ mode: 'mapped-roles' });
		updateRole(MEMBER, { label: 'Recrue', permission: 'member' });
		expect(permissionFor(onServer([GUEST]))).toBeNull();
		expect(permissionFor(onServer([]))).toBeNull();
		expect(permissionFor(onServer([MEMBER]))).toBe('member');
		expect(permissionFor(onServer([MEMBER, OFFICER]))).toBe('officer');
	});

	it('un compte absent du serveur n’a aucun accès, quel que soit le mode', () => {
		const absent = { roles: [], inGuild: false };
		setAccess({ mode: 'all-members' });
		expect(permissionFor(absent)).toBeNull();
		// Rôles en cache d'un ancien officier qui a quitté le serveur : ignorés.
		expect(permissionFor({ roles: [OFFICER], inGuild: false })).toBeNull();
		setAccess({ mode: 'mapped-roles' });
		expect(permissionFor(absent)).toBeNull();
	});

	it('la connexion Discord enregistre si le compte est sur le serveur', () => {
		setAccess({ mode: 'all-members' });
		const stored = (id: string) => db().select().from(schema.users).where(eq(schema.users.discordId, id)).get()!;

		recordDiscordLogin('900000000000000101', { username: 'inconnu', name: null, image: null }, null);
		expect(stored('900000000000000101')).toMatchObject({ inGuild: false, roles: [] });
		expect(permissionFor(stored('900000000000000101'))).toBeNull();

		// Sur le serveur sans aucun rôle : membre en mode « tout membre du serveur ».
		recordDiscordLogin('900000000000000102', { username: 'nouveau', name: 'Nouveau', image: null }, { nick: null, roles: [] });
		expect(stored('900000000000000102')).toMatchObject({ inGuild: true, roles: [], displayName: 'Nouveau' });
		expect(permissionFor(stored('900000000000000102'))).toBe('member');

		// Il quitte le serveur puis se reconnecte : plus d'accès.
		recordDiscordLogin('900000000000000102', { username: 'nouveau', name: 'Nouveau', image: null }, null);
		expect(permissionFor(stored('900000000000000102'))).toBeNull();
	});

	it('compte les joueurs du site qui portent chaque rôle', () => {
		createUser('p1', [MEMBER]);
		createUser('p2', [MEMBER, OFFICER]);
		const byId = new Map(listRoles().map((r) => [r.id, r.members]));
		expect(byId.get(MEMBER)).toBe(2);
		expect(byId.get(OFFICER)).toBe(1);
		expect(byId.get(GUEST)).toBe(0);
	});
});
