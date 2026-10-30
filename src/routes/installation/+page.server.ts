import { error, fail, redirect } from '@sveltejs/kit';
import {
	checkSetupCode,
	consumeSetupCode,
	createLocalAdmin,
	hasLocalAdmin,
	openSession
} from '$lib/server/local-admin';
import { auditLogin } from '$lib/server/audit';
import { isSetupComplete } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (isSetupComplete()) redirect(303, '/admin');
	if (hasLocalAdmin()) redirect(303, locals.admin ? '/installation/discord' : '/admin/connexion?suite=/installation/discord');
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		if (hasLocalAdmin()) error(409, 'Le compte admin existe déjà');
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const values = { username };
		const invalid = (field: string, message: string) =>
			fail(400, { values, errors: { [field]: message } as Record<string, string> });

		if (!checkSetupCode(code)) return invalid('code', 'Code incorrect : copie-le depuis les logs du conteneur.');
		if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username))
			return invalid('username', '3 à 32 caractères : lettres, chiffres, point, tiret, tiret bas.');
		if (password.length < 12) return invalid('password', '12 caractères minimum.');
		if (password !== form.get('confirm')) return invalid('confirm', 'Les deux mots de passe diffèrent.');

		const admin = createLocalAdmin(username, password);
		auditLogin('admin.create', username, getClientAddress());
		consumeSetupCode();
		openSession(cookies, admin, url.protocol === 'https:');
		redirect(303, '/installation/discord');
	}
};
