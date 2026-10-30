import { fail } from '@sveltejs/kit';
import { audit, diff } from '$lib/server/audit';
import { parseGuildForm } from '$lib/server/guild-form';
import { requireOfficer } from '$lib/server/guards';
import { getGuild, setGuild } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	return { guild: getGuild(), timezones: Intl.supportedValuesOf('timeZone') };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		requireOfficer(locals);
		const before = getGuild();
		const parsed = await parseGuildForm(await request.formData(), before);
		if (!parsed.data) return fail(400, { errors: parsed.errors, values: parsed.values });
		setGuild(parsed.data);
		// Seuls les noms des champs modifiés : les textes de présentation peuvent être longs.
		const fields = Object.keys(diff(before, parsed.data, Object.keys(parsed.data)));
		if (fields.length) audit(locals, 'guild.update', { label: parsed.data.name, url: '/admin/guilde' }, { champs: fields });
		return { saved: true };
	}
};
