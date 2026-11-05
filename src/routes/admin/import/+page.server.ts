import { randomBytes } from 'node:crypto';
import { fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { applyImport, ImportError, planImport, readExport, rosterReport, type ImportPlan } from '$lib/server/game-import';
import { requireOfficer } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

const MAX_BYTES = 5 * 1024 * 1024;
// Aperçus en attente de confirmation, gardés 15 minutes (un seul processus Node).
const pending = new Map<string, { plan: ImportPlan; at: number }>();
const TTL_MS = 15 * 60_000;

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	return { report: rosterReport() };
};

export const actions: Actions = {
	preview: async ({ locals, request }) => {
		requireOfficer(locals);
		const file = (await request.formData()).get('file');
		if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Choisis le fichier InnkeeperSync.lua.' });
		if (file.size > MAX_BYTES) return fail(400, { error: 'Fichier trop lourd (5 Mo maximum).' });
		let plan: ImportPlan;
		try {
			plan = planImport(readExport(await file.text()));
		} catch (e) {
			if (e instanceof ImportError) return fail(400, { error: e.message });
			throw e;
		}
		for (const [k, v] of pending) if (Date.now() - v.at > TTL_MS) pending.delete(k);
		const token = randomBytes(16).toString('hex');
		pending.set(token, { plan, at: Date.now() });
		return { token, plan };
	},
	apply: async ({ locals, request }) => {
		requireOfficer(locals);
		const token = String((await request.formData()).get('token') ?? '');
		const entry = pending.get(token);
		if (!entry) return fail(400, { error: 'Aperçu expiré : dépose le fichier à nouveau.' });
		pending.delete(token);
		const changed = applyImport(entry.plan, { by: locals.user?.displayName ?? locals.admin?.username ?? null, via: 'manual' });
		audit(locals, 'game.import', { label: entry.plan.guild ?? 'Import du jeu', url: '/admin/import' }, {
			persos: changed,
			synchronises: entry.plan.updates.length,
			sansFiche: entry.plan.withoutSheet.length,
			export: entry.plan.exportedAt.toISOString()
		});
		return { applied: changed, synced: entry.plan.updates.length };
	}
};
