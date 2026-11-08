import { error, fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import { canEdit, characterTarget, deleteCharacter, getCharacter, listCharacters, setMain } from '$lib/server/characters';
import { homonyms } from '$lib/server/game-import';
import { requireUser } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const user = requireUser(locals);
	const characters = listCharacters(user.id);
	return { characters, homonyms: homonyms(characters.map((c) => c.id)) };
};

async function editableFromForm(locals: App.Locals, request: Request) {
	const character = getCharacter(Number((await request.formData()).get('id')));
	if (!character) error(404, 'Perso introuvable');
	if (!canEdit(locals, character)) error(403);
	return character;
}

export const actions: Actions = {
	setMain: async ({ locals, request }) => {
		const character = await editableFromForm(locals, request);
		setMain(character);
		if (character.userId !== locals.user?.id) audit(locals, 'character.set-main', characterTarget(character));
	},
	delete: async ({ locals, request }) => {
		const character = await editableFromForm(locals, request);
		const target = characterTarget(character);
		const message = deleteCharacter(character);
		if (message) return fail(400, { message });
		if (character.userId !== locals.user?.id) audit(locals, 'character.delete', { label: target.label });
	}
};
