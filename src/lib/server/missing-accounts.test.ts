import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUser, horde } from '../../test/helpers';
import { recordSeenRoles, updateRole } from './permissions';
import { membersWithoutAccount } from './missing-accounts';
import { setAccess, setDiscord } from './settings';

horde();

const OFFICER = '100000000000000001';
const MEMBER = '100000000000000002';
const SCOUT = '100000000000000003';

describe('membres Discord sans compte sur le site', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('garde ceux dont un rôle donne accès, sans compte, hors bots et invités', async () => {
		setDiscord({ clientId: '111111111111111111', clientSecret: 'secret-secret-123', guildId: '222222222222222222', botToken: 'b' });
		setAccess({ mode: 'mapped-roles' });
		recordSeenRoles([OFFICER, MEMBER, SCOUT]);
		updateRole(OFFICER, { label: 'Officier', permission: 'officer' });
		updateRole(MEMBER, { label: 'Recrue', permission: 'member' });
		updateRole(SCOUT, { label: 'Éclaireur', permission: 'none' });
		createUser('deja', [MEMBER]);

		const member = (id: string, name: string, roles: string[], bot = false) => ({
			user: { id, username: name.toLowerCase(), global_name: name, avatar: null, bot },
			nick: null,
			roles,
			joined_at: '2026-10-01T10:00:00.000Z'
		});
		vi.stubGlobal('fetch', async () =>
			Response.json([
				member('deja', 'Deja', [MEMBER]),
				member('m1', 'Zoe', [MEMBER]),
				member('o1', 'Varok', [OFFICER, MEMBER]),
				member('s1', 'Invité', [SCOUT]),
				member('b1', 'Raid-Helper', [MEMBER], true),
				member('n1', 'SansRole', [])
			])
		);

		const missing = await membersWithoutAccount();
		expect(missing.map((m) => [m.name, m.permission, m.topRole])).toEqual([
			['Varok', 'officer', 'Officier'],
			['Zoe', 'member', 'Recrue']
		]);
	});
});
