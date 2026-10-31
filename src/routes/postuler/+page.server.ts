import { fail, redirect } from '@sveltejs/kit';
import { parseCharacterForm } from '$lib/server/characters';
import { applyBlocker, submitApplication } from '$lib/server/recruitment';
import { getCharter, getDiscord, getGuild, getRecruitment } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const open = Boolean(getGuild()?.recruitment.open);
	if (locals.user) return { state: 'member' as const };
	if (!locals.candidate) return { state: 'anonymous' as const, open, discordReady: Boolean(getDiscord()) };

	const blocker = applyBlocker(locals.candidate.id);
	if (blocker?.reason === 'pending' || blocker?.reason === 'accepted') redirect(303, '/candidature');
	if (blocker?.reason === 'cooldown') return { state: 'cooldown' as const, until: blocker.until! };
	if (!open) return { state: 'closed' as const };
	return { state: 'form' as const, questions: getRecruitment().questions, charter: getCharter() };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const candidate = locals.candidate;
		if (!candidate || applyBlocker(candidate.id) || !getGuild()?.recruitment.open) redirect(303, '/postuler');

		const form = await request.formData();
		const parsed = parseCharacterForm(form);
		const questions = getRecruitment().questions;
		const answers = questions.map((question, i) => ({ question, answer: String(form.get(`answer-${i}`) ?? '').trim().slice(0, 2000) }));
		const missing = answers.findIndex((a) => a.answer.length < 2);
		// Quand la guilde a publié une charte, le candidat doit l'accepter.
		const charter = form.get('charter') === 'on';
		const charterMissing = Boolean(getCharter()) && !charter;

		if (!parsed.data || missing >= 0 || charterMissing) {
			const errors: Record<string, string> = { ...(parsed.errors ?? {}) };
			if (missing >= 0) errors[`answer-${missing}`] = 'Réponse requise';
			if (charterMissing) errors.charter = 'Accepte la charte pour envoyer ta candidature';
			return fail(400, { errors, values: parsed.values ?? null, answers: answers.map((a) => a.answer), charter });
		}

		const { isMain: _, ...character } = parsed.data;
		submitApplication(candidate.id, character, answers, getCharter() ? new Date() : null);
		redirect(303, '/candidature');
	}
};
