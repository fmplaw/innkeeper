import { randomBytes } from 'node:crypto';
import { fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { isConfigured, syncBattlenet } from '$lib/server/battlenet';
import { applyImport, ImportError, planImport, readExport, rosterReport, type ImportPlan } from '$lib/server/game-import';
import { requireOfficer } from '$lib/server/guards';
import { battlenetSchema, getBattlenet, getBattlenetStatus, getGameRanks, getGuild, setBattlenet } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

const MAX_BYTES = 5 * 1024 * 1024;
// Aperçus en attente de confirmation, gardés 15 minutes (un seul processus Node).
const pending = new Map<string, { plan: ImportPlan; at: number }>();
const TTL_MS = 15 * 60_000;

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	const bnet = getBattlenet();
	return {
		report: rosterReport(),
		// La clé secrète ne quitte jamais le serveur : seulement « enregistrée ou non ».
		battlenet: {
			clientId: bnet.clientId,
			hasSecret: Boolean(bnet.clientSecret),
			region: bnet.region,
			guildSlug: bnet.guildSlug || slugify(getGuild()?.name ?? ''),
			configured: isConfigured(bnet),
			status: getBattlenetStatus(),
			ranks: getGameRanks()
		}
	};
};

/** « Le Pacte des Anciens » → « le-pacte-des-anciens », comme dans l'adresse de l'Armurerie. */
const slugify = (name: string) =>
	name
		.trim()
		.toLocaleLowerCase('fr')
		.replace(/['’]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-|-$/g, '');

export const actions: Actions = {
	battlenet: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const current = getBattlenet();
		const secret = String(form.get('clientSecret') ?? '').trim();
		const parsed = battlenetSchema.safeParse({
			clientId: String(form.get('clientId') ?? '').trim() || null,
			// Champ laissé vide : on garde la clé déjà enregistrée.
			clientSecret: secret || current.clientSecret,
			region: form.get('region'),
			guildSlug: String(form.get('guildSlug') ?? '')
		});
		if (!parsed.success) return fail(400, { battlenetError: parsed.error.issues[0].message });
		if (!parsed.data.clientId || !parsed.data.clientSecret || !parsed.data.guildSlug)
			return fail(400, { battlenetError: 'Client ID, clé secrète et nom de la guilde sont nécessaires.' });
		setBattlenet(parsed.data);
		audit(locals, 'battlenet.update', { label: 'Battle.net', url: '/admin/import' }, { guilde: parsed.data.guildSlug, region: parsed.data.region, cle: secret ? 'changée' : undefined });
		// Premier essai tout de suite : les erreurs de clé ou de nom de guilde se voient aussitôt.
		const result = await syncBattlenet(locals);
		return { battlenetResult: result };
	},
	battlenetSync: async ({ locals }) => {
		requireOfficer(locals);
		return { battlenetResult: await syncBattlenet(locals) };
	},
	battlenetOff: async ({ locals }) => {
		requireOfficer(locals);
		setBattlenet({ ...getBattlenet(), clientId: null, clientSecret: null });
		audit(locals, 'battlenet.update', { label: 'Battle.net', url: '/admin/import' }, { connexion: 'retirée' });
		return { battlenetResult: { ok: true, message: 'Connexion Battle.net retirée : plus de synchronisation automatique.' } };
	},
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
