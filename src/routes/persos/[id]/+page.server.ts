import { error, fail, redirect } from '@sveltejs/kit';
import {
	AUDITED_CHARACTER_FIELDS,
	canEdit,
	characterTarget,
	deleteCharacter,
	getCharacter,
	getMain,
	parseCharacterForm,
	updateCharacter
} from '$lib/server/characters';
import { audit, diff } from '$lib/server/audit';
import { requireViewer } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

function loadEditable(locals: App.Locals, rawId: string) {
	requireViewer(locals);
	const character = getCharacter(Number(rawId));
	if (!character) error(404, 'Perso introuvable');
	if (!canEdit(locals, character)) error(403, 'Ce perso ne t’appartient pas');
	return { character };
}

const backTo = (locals: App.Locals, ownerId: string) => (ownerId === locals.user?.id ? '/persos' : '/admin');

export const load: PageServerLoad = ({ locals, params }) => {
	const { character } = loadEditable(locals, params.id);
	return { character, mainName: character.isMain ? null : (getMain(character.userId)?.name ?? null) };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const { character } = loadEditable(locals, params.id);
		const parsed = parseCharacterForm(await request.formData());
		if (!parsed.data) return fail(400, { errors: parsed.errors, values: parsed.values });

		updateCharacter(character, parsed.data);
		if (character.userId !== locals.user?.id)
			audit(locals, 'character.update', characterTarget(character), diff(character, parsed.data, AUDITED_CHARACTER_FIELDS));
		redirect(303, backTo(locals, character.userId));
	},
	delete: async ({ locals, params }) => {
		const { character } = loadEditable(locals, params.id);
		const target = characterTarget(character);
		const message = deleteCharacter(character);
		if (message) return fail(400, { message });
		if (character.userId !== locals.user?.id) audit(locals, 'character.delete', { label: target.label });
		redirect(303, backTo(locals, character.userId));
	}
};
