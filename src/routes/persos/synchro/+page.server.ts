import { fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { requireUser } from '$lib/server/guards';
import { createSyncToken, listSyncTokens, MAX_TOKENS, revokeSyncToken, SyncError } from '$lib/server/sync';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const user = requireUser(locals);
	return { tokens: listSyncTokens(user.id), maxTokens: MAX_TOKENS, officer: user.permission === 'officer', origin: url.origin };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const user = requireUser(locals);
		const label = String((await request.formData()).get('label') ?? '');
		try {
			const token = createSyncToken(user.id, label);
			audit(locals, 'sync-token.create', { label: label.trim() || 'Mon PC', url: '/persos/synchro' });
			return { token };
		} catch (e) {
			if (e instanceof SyncError) return fail(400, { error: e.message });
			throw e;
		}
	},
	// Bouton « Connecter InnkeeperSync » : la clé part directement dans l'application par un lien
	// innkeeper://, qui demande confirmation avant de l'utiliser.
	connect: async ({ locals, url }) => {
		const user = requireUser(locals);
		const label = `InnkeeperSync du ${new Date().toLocaleDateString('fr-FR')}`;
		try {
			const token = createSyncToken(user.id, label);
			audit(locals, 'sync-token.create', { label, url: '/persos/synchro' });
			return { token, link: `innkeeper://connect?site=${encodeURIComponent(url.origin)}&token=${token}` };
		} catch (e) {
			if (e instanceof SyncError) return fail(400, { error: e.message });
			throw e;
		}
	},
	revoke: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		if (revokeSyncToken(user.id, Number(form.get('id')))) audit(locals, 'sync-token.revoke', { label: String(form.get('label') ?? ''), url: '/persos/synchro' });
	}
};
