import { fail } from '@sveltejs/kit';
import { PERMISSIONS } from '$lib/server/db/schema';
import { audit } from '$lib/server/audit';
import { requireOfficer } from '$lib/server/guards';
import { listRoles, syncRolesFromBot, updateRole } from '$lib/server/permissions';
import { accessSchema, getAccess, getDiscord, setAccess } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	const discord = getDiscord();
	return { roles: listRoles(), access: getAccess(), discordReady: Boolean(discord), hasBot: Boolean(discord?.botToken) };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		// Sans choix transmis (formulaire incomplet), le mode actuel est conservé.
		const access = accessSchema.safeParse({ mode: form.get('access') ?? getAccess().mode });
		if (!access.success) return fail(400, { error: 'Mode d’accès invalide' });
		const previousMode = getAccess().mode;
		setAccess(access.data);
		if (previousMode !== access.data.mode) audit(locals, 'access.update', undefined, { avant: previousMode, apres: access.data.mode });

		const known = new Map(listRoles().map((r) => [r.id, r]));
		const changes: Record<string, string> = {};
		for (const id of form.getAll('roleId').map(String)) {
			const role = known.get(id);
			const permission = String(form.get(`permission-${id}`));
			if (!role || !PERMISSIONS.includes(permission as never)) continue;
			const label = String(form.get(`label-${id}`) ?? '').trim().slice(0, 60) || null;
			updateRole(id, { label, permission: permission as (typeof PERMISSIONS)[number] });
			if (role.permission !== permission || role.label !== label)
				changes[role.name ?? label ?? id] = `${role.permission} → ${permission}${role.label !== label ? ` (nom : ${label ?? '—'})` : ''}`;
		}
		if (Object.keys(changes).length) audit(locals, 'roles.update', undefined, changes);
		return { saved: true };
	},
	sync: async ({ locals }) => {
		requireOfficer(locals);
		try {
			const synced = await syncRolesFromBot();
			audit(locals, 'roles.sync', undefined, { roles: synced });
			return { synced };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Synchronisation impossible' });
		}
	}
};
