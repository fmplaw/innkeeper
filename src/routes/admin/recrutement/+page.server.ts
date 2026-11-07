import { fail } from '@sveltejs/kit';
import { audit, diff } from '$lib/server/audit';
import { BotError, botReady, postMessage, textChannels } from '$lib/server/bot';
import { requireOfficer } from '$lib/server/guards';
import { listRoles } from '$lib/server/permissions';
import { DEFAULT_QUESTIONS, getRecruitment, recruitmentSchema, setRecruitment } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireOfficer(locals);
	let channels: { id: string; name: string }[] = [];
	let channelsError: string | null = null;
	if (botReady()) {
		try {
			channels = (await textChannels()).map((c) => ({ id: c.id, name: c.name }));
		} catch (e) {
			channelsError = e instanceof BotError ? e.message : 'Discord ne répond pas.';
		}
	}
	return {
		settings: getRecruitment(),
		defaultQuestions: DEFAULT_QUESTIONS,
		roles: listRoles().map((r) => ({ id: r.id, name: r.name ?? r.label ?? r.id })),
		channels,
		channelsError,
		botReady: botReady()
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const parsed = recruitmentSchema.safeParse({
			arrivalRoleId: form.get('arrivalRoleId') ?? '',
			notifyChannelId: form.get('notifyChannelId') ?? '',
			mentionRoleId: form.get('mentionRoleId') ?? '',
			inviteChannelId: form.get('inviteChannelId') ?? '',
			reapplyDays: form.get('reapplyDays'),
			reviewDays: form.get('reviewDays'),
			demoteFormer: form.get('demoteFormer') === 'on',
			formerRoleId: form.get('formerRoleId') ?? '',
			questions: String(form.get('questions') ?? '')
				.split('\n')
				.map((q) => q.trim())
				.filter(Boolean)
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const before = getRecruitment();
		setRecruitment(parsed.data);
		const changes = diff(before, parsed.data, Object.keys(parsed.data));
		if (Object.keys(changes).length) audit(locals, 'recruitment.update', { label: 'Recrutement', url: '/admin/recrutement' }, { champs: Object.keys(changes) });
		return { saved: true };
	},
	test: async ({ locals }) => {
		requireOfficer(locals);
		const { notifyChannelId } = getRecruitment();
		if (!notifyChannelId) return fail(400, { error: 'Choisis d’abord le salon des annonces, puis enregistre.' });
		try {
			await postMessage(notifyChannelId, {
				embeds: [{ title: 'Test des annonces de candidature', description: 'Le bot peut poster ici. Les nouvelles candidatures apparaîtront dans ce salon.' }]
			});
			return { tested: true };
		} catch (e) {
			return fail(400, { error: e instanceof BotError ? e.message : 'Discord ne répond pas.' });
		}
	}
};
