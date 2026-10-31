import { describe, expect, it } from 'vitest';
import { actions } from '../../routes/postuler/+page.server';
import { createUser, formData, horde, shaman } from '../../test/helpers';
import { latestApplication } from './recruitment';
import { charterSchema, getCharter, getGuild, getRecruitment, setCharter, setGuild } from './settings';

horde();
setGuild({ ...getGuild()!, recruitment: { open: true, classes: [], roles: [], text: '' } });

const asCandidate = (id: string) =>
	({ user: null, candidate: { id, displayName: `Candidat ${id}`, avatar: null }, admin: null }) as unknown as App.Locals;

// Envoie le formulaire de candidature ; renvoie l'échec, ou null si la candidature est partie (redirection).
async function apply(id: string, extra: Record<string, string> = {}) {
	createUser(id, []);
	const answers = Object.fromEntries(getRecruitment().questions.map((_, i) => [`answer-${i}`, 'Une vraie réponse']));
	const request = new Request('http://localhost/postuler', { method: 'POST', body: formData({ ...shaman(), ...answers, ...extra }) });
	try {
		return await actions.default({ locals: asCandidate(id), request } as never);
	} catch (e) {
		if ((e as { status?: number }).status === 303) return null;
		throw e;
	}
}

describe('charte et règlement', () => {
	it('sans texte, pas de charte', () => {
		expect(getCharter()).toBeNull();
		setCharter(charterSchema.parse({ text: '   ' }));
		expect(getCharter()).toBeNull();
		expect(charterSchema.safeParse({ text: 'x'.repeat(20_001) }).success).toBe(false);
	});

	it('sans charte publiée, la candidature part sans case à cocher', async () => {
		expect(await apply('libre')).toBeNull();
		expect(latestApplication('libre')?.charterAcceptedAt).toBeNull();
	});

	it('avec une charte, il faut l’accepter, et l’acceptation est datée', async () => {
		setCharter(charterSchema.parse({ text: '# Règlement\n- Respect', updatedAt: Date.now(), updatedBy: 'Vinshal' }));
		const refused = (await apply('distrait')) as { status: number; data: { errors: Record<string, string> } };
		expect(refused.status).toBe(400);
		expect(refused.data.errors.charter).toMatch(/charte/);
		expect(latestApplication('distrait')).toBeUndefined();

		expect(await apply('lecteur', { charter: 'on' })).toBeNull();
		expect(latestApplication('lecteur')?.charterAcceptedAt).toBeInstanceOf(Date);
	});
});
