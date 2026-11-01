import { describe, expect, it } from 'vitest';
import { actions, load } from '../../routes/admin/roles/+page.server';
import { asAdmin, asMember, formData } from '../../test/helpers';
import { listRoles, recordSeenRoles } from './permissions';
import { getAccess, setAccess } from './settings';

const ROLE = '900000000000000011';

// Les permissions décident qui est officier et qui entre sur le site : un officier ne doit
// pas pouvoir se donner des pairs ni ouvrir le site seul.
describe('Admin → Rôles Discord', () => {
	const save = (locals: App.Locals) =>
		actions.save({ locals, request: new Request('http://localhost/admin/roles', { method: 'POST', body: formData({ access: 'all-members', roleId: ROLE, [`permission-${ROLE}`]: 'officer' }) }) } as never);

	it('est fermé aux officiers Discord', async () => {
		recordSeenRoles([ROLE]);
		setAccess({ mode: 'mapped-roles' });
		const officer = asMember('o1', 'officer');
		expect(() => load({ locals: officer } as never)).toThrow(expect.objectContaining({ status: 303, location: '/admin/connexion' }));
		await expect(save(officer)).rejects.toMatchObject({ status: 303 });
		await expect(actions.sync({ locals: officer } as never)).rejects.toMatchObject({ status: 303 });
		expect(getAccess().mode).toBe('mapped-roles');
		expect(listRoles().find((r) => r.id === ROLE)?.permission).toBe('none');
	});

	it('reste ouvert à l’admin local', async () => {
		expect(load({ locals: asAdmin() } as never)).toMatchObject({ access: { mode: 'mapped-roles' } });
		expect(await save(asAdmin())).toEqual({ saved: true });
		expect(getAccess().mode).toBe('all-members');
		expect(listRoles().find((r) => r.id === ROLE)?.permission).toBe('officer');
	});
});
