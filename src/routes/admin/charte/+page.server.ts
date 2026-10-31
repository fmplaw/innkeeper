import { fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { requireOfficer } from '$lib/server/guards';
import { charterSchema, getCharter, setCharter } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireOfficer(locals);
	return { charter: getCharter() };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		requireOfficer(locals);
		const text = String((await request.formData()).get('text') ?? '');
		const parsed = charterSchema.safeParse({
			text,
			updatedAt: Date.now(),
			updatedBy: locals.user?.displayName ?? locals.admin?.username ?? null
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message, text });
		const before = getCharter()?.text ?? '';
		if (parsed.data.text === before) return { saved: true };
		setCharter(parsed.data);
		audit(locals, 'charter.update', { label: 'Charte et règlement', url: '/charte' }, { caracteres: parsed.data.text.length });
		return { saved: true };
	}
};
