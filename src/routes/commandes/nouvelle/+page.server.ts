import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { readMoney } from '$lib/money';
import { priceTable } from '$lib/server/auction';
import { createOrder, MAX_ACTIVE, recipeChoice } from '$lib/server/crafts';
import { requireUser } from '$lib/server/guards';
import { getCrafts } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	requireUser(locals);
	const recipe = recipeChoice(Number(url.searchParams.get('recette')));
	return { recipe, artisan: url.searchParams.get('artisan'), max: MAX_ACTIVE, announced: Boolean(getCrafts().channelId), ...priceTable((recipe?.reagents ?? []).map((r) => r.id)) };
};

const orderSchema = z.object({
	recipeId: z.coerce.number().int().positive(),
	quantity: z.coerce.number({ message: 'Quantité invalide' }).int('Quantité invalide').min(1, 'Au moins 1').max(200, '200 au plus'),
	materials: z.boolean(),
	comment: z.preprocess((v) => (typeof v === 'string' ? v.trim() || null : null), z.string().max(300, 'Commentaire trop long (300 caractères au plus)').nullable()),
	artisanId: z.preprocess((v) => (typeof v === 'string' && v ? v : null), z.string().regex(/^\d{17,20}$/).nullable())
});

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const parsed = orderSchema.safeParse({
			recipeId: form.get('recipeId'),
			quantity: form.get('quantity'),
			materials: form.get('materials') === 'provided',
			comment: form.get('comment'),
			artisanId: form.get('artisanId')
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const commission = readMoney(form, 'commission');
		const budget = readMoney(form, 'budget');
		if ('error' in commission) return fail(400, { error: commission.error });
		if ('error' in budget) return fail(400, { error: budget.error });
		const result = await createOrder(user.id, { ...parsed.data, commission: commission.value, budget: budget.value });
		if ('error' in result) return fail(400, { error: result.error });
		redirect(303, `/commandes?passee=${result.order.id}${result.announced || !getCrafts().channelId ? '' : '&discord=0'}#commande-${result.order.id}`);
	}
};
