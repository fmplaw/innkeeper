import { fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { createAddon, deleteAddon, getAddon, INNKEEPER_SYNC, listAddons, moveAddon, parseAddonForm, updateAddon } from '$lib/server/addons';
import { requireOfficer } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

const target = (name: string) => ({ label: name, url: '/addons' });

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	const addons = listAddons();
	return { addons, hasInnkeeperSync: addons.some((a) => a.name.toLowerCase() === INNKEEPER_SYNC.name.toLowerCase()) };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireOfficer(locals);
		const parsed = parseAddonForm(await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message, form: 'new' });
		createAddon(parsed.data);
		audit(locals, 'addon.create', target(parsed.data.name), { importance: parsed.data.importance });
		return { saved: `« ${parsed.data.name} » ajouté.` };
	},
	innkeeperSync: async ({ locals }) => {
		requireOfficer(locals);
		createAddon(INNKEEPER_SYNC);
		audit(locals, 'addon.create', target(INNKEEPER_SYNC.name));
		return { saved: '« Innkeeper Sync » ajouté.' };
	},
	update: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const parsed = parseAddonForm(form);
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message, form: id });
		if (!updateAddon(id, parsed.data)) return fail(404, { error: 'Addon introuvable', form: id });
		audit(locals, 'addon.update', target(parsed.data.name));
		return { saved: `« ${parsed.data.name} » enregistré.` };
	},
	move: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		moveAddon(Number(form.get('id')), form.get('direction') === 'up' ? 'up' : 'down');
	},
	delete: async ({ locals, request }) => {
		requireOfficer(locals);
		const id = Number((await request.formData()).get('id'));
		const addon = getAddon(id);
		if (addon && deleteAddon(id)) audit(locals, 'addon.delete', { label: addon.name });
		return { saved: addon ? `« ${addon.name} » retiré.` : null };
	}
};
