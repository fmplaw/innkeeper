import { describe, expect, it } from 'vitest';
import { actions as accountActions } from '../../routes/admin/compte/+page.server';
import { load as journalLoad } from '../../routes/admin/journal/+page.server';
import { load as rolesLoad } from '../../routes/admin/roles/+page.server';
import { asAdmin, asMember, createUser, formData } from '../../test/helpers';
import { isInstanceAdmin, requireInstanceAdmin } from './guards';
import { discordAccounts, sitePermission } from './permissions';
import { setAccess } from './settings';

// Admins Discord : un joueur désigné par l'admin local a ses droits avec sa connexion Discord.
const asDiscordAdmin = (id: string) => {
	const locals = asMember(id, 'officer');
	locals.user!.instanceAdmin = true;
	return locals;
};
const designate = (id: string, grant: boolean, locals: App.Locals = asAdmin()) =>
	accountActions.discordAdmin({
		locals,
		request: new Request('http://localhost/admin/compte', { method: 'POST', body: formData({ id, grant: grant ? '1' : '0' }) })
	} as never);

describe('admins Discord de l’instance', () => {
	it('un admin Discord a les droits d’officier, même sans rôle ni présence sur le serveur', () => {
		setAccess({ mode: 'mapped-roles' });
		expect(sitePermission({ roles: [], inGuild: true, instanceAdmin: false })).toBeNull();
		expect(sitePermission({ roles: [], inGuild: false, instanceAdmin: true })).toBe('officer');
	});

	it('accède aux réglages de l’instance, pas un simple officier', () => {
		expect(isInstanceAdmin(asDiscordAdmin('a1'))).toBe(true);
		expect(isInstanceAdmin(asAdmin())).toBe(true);
		expect(isInstanceAdmin(asMember('o1', 'officer'))).toBe(false);
		expect(() => requireInstanceAdmin(asMember('o1', 'officer'))).toThrow(expect.objectContaining({ status: 303 }));
		expect(() => rolesLoad({ locals: asDiscordAdmin('a1') } as never)).not.toThrow();
		expect(() => journalLoad({ locals: asDiscordAdmin('a1'), url: new URL('http://localhost/admin/journal') } as never)).not.toThrow();
		expect(() => rolesLoad({ locals: asMember('o1', 'officer') } as never)).toThrow(expect.objectContaining({ status: 303 }));
	});

	it('seul le compte admin local nomme ou retire un admin Discord', async () => {
		createUser('fridarius');
		expect(await designate('fridarius', true)).toEqual({ discordChanged: 'Joueur fridarius', granted: true });
		expect(discordAccounts().find((a) => a.id === 'fridarius')?.instanceAdmin).toBe(true);
		// Un admin Discord ne peut pas en nommer un autre : le compte local reste maître.
		createUser('intrus');
		await expect(designate('intrus', true, asDiscordAdmin('fridarius'))).rejects.toMatchObject({ status: 303 });
		expect(discordAccounts().find((a) => a.id === 'intrus')?.instanceAdmin).toBe(false);
		// Compte jamais connecté : refusé.
		expect(await designate('inconnu', true)).toMatchObject({ status: 400 });
		expect(await designate('fridarius', false)).toEqual({ discordChanged: 'Joueur fridarius', granted: false });
		expect(discordAccounts().find((a) => a.id === 'fridarius')?.instanceAdmin).toBe(false);
	});
});
