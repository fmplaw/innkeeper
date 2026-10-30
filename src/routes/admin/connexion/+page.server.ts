import { fail, redirect } from '@sveltejs/kit';
import { auditLogin } from '$lib/server/audit';
import { closeSession, login, openSession } from '$lib/server/local-admin';
import type { Actions, PageServerLoad } from './$types';

// Seuls les chemins internes sont acceptés comme destination après connexion.
const safeNext = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/admin');

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.admin) redirect(303, safeNext(url.searchParams.get('suite')));
};

export const actions: Actions = {
	login: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const ip = getClientAddress();
		const result = login(username, String(form.get('password') ?? ''), ip);
		if (result.error) {
			auditLogin('admin.login-failed', username || '(vide)', ip);
			return fail(400, { username, error: result.error });
		}
		auditLogin('admin.login', result.admin.username, ip);
		openSession(cookies, result.admin, url.protocol === 'https:');
		redirect(303, safeNext(url.searchParams.get('suite')));
	},
	logout: ({ cookies }) => {
		closeSession(cookies);
		redirect(303, '/');
	}
};
