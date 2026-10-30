import { describe, expect, it } from 'vitest';
import { listRoles, permissionFor, recordSeenRoles, updateRole } from './permissions';
import { createUser } from '../../test/helpers';
import { setAccess } from './settings';

const OFFICER = '900000000000000001';
const MEMBER = '900000000000000005';
const GUEST = '900000000000000006';

describe('permissions selon les rôles Discord', () => {
	it('découvre les rôles des membres qui se connectent, sans permission par défaut', () => {
		recordSeenRoles([OFFICER, MEMBER, GUEST]);
		expect(listRoles().map((r) => r.id).sort()).toEqual([OFFICER, MEMBER, GUEST].sort());
		expect(listRoles().every((r) => r.permission === 'none')).toBe(true);
	});

	it('mode « tout membre du serveur » : tout le monde est membre, les officiers sont désignés par rôle', () => {
		setAccess({ mode: 'all-members' });
		updateRole(OFFICER, { label: 'Chef de Guerre', permission: 'officer' });
		expect(permissionFor([GUEST])).toBe('member');
		expect(permissionFor([])).toBe('member');
		expect(permissionFor([GUEST, OFFICER])).toBe('officer');
	});

	it('mode « rôles désignés » : sans rôle Membre ou Officier, pas d’accès (les Éclaireurs restent dehors)', () => {
		setAccess({ mode: 'mapped-roles' });
		updateRole(MEMBER, { label: 'Recrue', permission: 'member' });
		expect(permissionFor([GUEST])).toBeNull();
		expect(permissionFor([])).toBeNull();
		expect(permissionFor([MEMBER])).toBe('member');
		expect(permissionFor([MEMBER, OFFICER])).toBe('officer');
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
