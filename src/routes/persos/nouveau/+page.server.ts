import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { audit } from '$lib/server/audit';
import { characterTarget, createCharacter, getMain, parseCharacterForm } from '$lib/server/characters';
import { db, schema } from '$lib/server/db';
import { requireOfficer, requireUser } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

// `?pour=<discord_id>` permet à un officier de créer un perso pour un autre joueur.
function resolveOwner(locals: App.Locals, url: URL) {
	const target = url.searchParams.get('pour');
	if (!target || target === locals.user?.id) {
		const user = requireUser(locals);
		return { id: user.id, displayName: user.displayName, self: true };
	}
	requireOfficer(locals);

	const owner = db().select().from(schema.users).where(eq(schema.users.discordId, target)).get();
	if (!owner) error(404, 'Joueur introuvable');
	return { id: owner.discordId, displayName: owner.displayName, self: false };
}

export const load: PageServerLoad = ({ locals, url }) => {
	const owner = resolveOwner(locals, url);
	return { owner, mainName: getMain(owner.id)?.name ?? null };
};

export const actions: Actions = {
	default: async ({ locals, url, request }) => {
		const owner = resolveOwner(locals, url);
		const parsed = parseCharacterForm(await request.formData());
		if (!parsed.data) return fail(400, { errors: parsed.errors, values: parsed.values });

		const created = createCharacter(owner.id, parsed.data);
		if (!owner.self) audit(locals, 'character.create', characterTarget(created));
		redirect(303, owner.self ? '/persos' : '/admin');
	}
};
