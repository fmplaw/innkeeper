import { fail } from '@sveltejs/kit';
import { addLocalAdmin, listLocalAdmins, login, openSession, removeLocalAdmin, setLocalAdminPassword } from '$lib/server/local-admin';
import { audit } from '$lib/server/audit';
import { requireLocalAdmin } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const admin = requireLocalAdmin(locals);
	return { username: admin.username, adminId: admin.id, mustChangePassword: admin.mustChangePassword, admins: listLocalAdmins() };
};

export const actions: Actions = {
	password: async ({ locals, request, cookies, url, getClientAddress }) => {
		const admin = requireLocalAdmin(locals);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const invalid = (field: string, message: string) => fail(400, { errors: { [field]: message } as Record<string, string> });

		const check = login(admin.username, String(form.get('current') ?? ''), getClientAddress());
		if (check.error) return invalid('current', 'Mot de passe actuel incorrect.');
		if (password.length < 12) return invalid('password', '12 caractères minimum.');
		if (password !== form.get('confirm')) return invalid('confirm', 'Les deux mots de passe diffèrent.');

		setLocalAdminPassword(admin.id, password);
		audit(locals, 'admin.password');
		// Les sessions ouvertes avec l'ancien mot de passe sont invalidées ; on rouvre la sienne.
		const updated = login(admin.username, password, getClientAddress());
		if (updated.admin) openSession(cookies, updated.admin, url.protocol === 'https:');
		return { saved: true };
	},
	add: async ({ locals, request }) => {
		const admin = requireLocalAdmin(locals);
		const username = String((await request.formData()).get('username') ?? '').trim();
		const result = addLocalAdmin(username, admin.username);
		if ('error' in result) return fail(400, { addError: result.error, username });
		audit(locals, 'admin.add', { label: username });
		// Affiché une seule fois : il n'est stocké que haché.
		return { added: { username, password: result.password } };
	},
	remove: async ({ locals, request }) => {
		const admin = requireLocalAdmin(locals);
		const result = removeLocalAdmin(Number((await request.formData()).get('id')), admin);
		if ('error' in result) return fail(400, { removeError: result.error });
		audit(locals, 'admin.remove', { label: result.removed.username });
		return { removed: result.removed.username };
	}
};
