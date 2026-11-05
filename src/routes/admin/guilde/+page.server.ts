import { fail } from '@sveltejs/kit';
import { audit, diff } from '$lib/server/audit';
import { removeClassIcon, saveClassIcon } from '$lib/server/class-icons';
import { parseGuildForm } from '$lib/server/guild-form';
import { requireOfficer } from '$lib/server/guards';
import { getGuild, getWowheadTooltips, setGuild, setWowheadTooltips } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	return { guild: getGuild(), timezones: Intl.supportedValuesOf('timeZone'), wowheadTooltips: getWowheadTooltips() };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireOfficer(locals);
		const before = getGuild();
		const parsed = await parseGuildForm(await request.formData(), before);
		if (!parsed.data) return fail(400, { errors: parsed.errors, values: parsed.values });
		setGuild(parsed.data);
		// Seuls les noms des champs modifiés : les textes de présentation peuvent être longs.
		const fields = Object.keys(diff(before, parsed.data, Object.keys(parsed.data)));
		if (fields.length) audit(locals, 'guild.update', { label: parsed.data.name, url: '/admin/guilde' }, { champs: fields });
		return { saved: true };
	},
	classIcon: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const classId = String(form.get('classId') ?? '');
		const file = form.get('icon');
		if (form.has('remove')) {
			removeClassIcon(classId);
		} else {
			if (!(file instanceof File) || file.size === 0) return fail(400, { iconError: 'Choisis une image.', iconClass: classId });
			const problem = await saveClassIcon(classId, file);
			if (problem) return fail(400, { iconError: problem, iconClass: classId });
		}
		audit(locals, 'class-icon.update', { label: classId, url: '/admin/guilde' }, { action: form.has('remove') ? 'retirée' : 'envoyée' });
		return { iconSaved: classId };
	},
	wowhead: async ({ locals, request }) => {
		requireOfficer(locals);
		const on = (await request.formData()).get('tooltips') === 'on';
		if (on !== getWowheadTooltips()) {
			setWowheadTooltips(on);
			audit(locals, 'guild.update', { label: 'Bulles Wowhead', url: '/admin/guilde' }, { champs: ['wowheadTooltips'], valeur: on ? 'activées' : 'désactivées' });
		}
		return { wowheadSaved: true };
	}
};
