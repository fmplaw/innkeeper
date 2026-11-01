import { fail } from '@sveltejs/kit';
import { ACTIVITIES } from '$lib/activities';
import { INSTANCES } from '$lib/game/forever';
import { removeActivityImage, saveActivityImage } from '$lib/server/activity-images';
import { audit, diff } from '$lib/server/audit';
import { BotError, botReady, textChannels } from '$lib/server/bot';
import { isInstanceAdmin, requireOfficer } from '$lib/server/guards';
import { createTemplate, deleteTemplate, getTemplate, listTemplates, templateSchema, updateTemplate } from '$lib/server/outings';
import { verifyApiKey } from '$lib/server/raidhelper';
import { listRosters } from '$lib/server/rosters';
import { getActivityImages, getDiscord, getRaidHelper, raidHelperSchema, setRaidHelper } from '$lib/server/settings';
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
	const settings = getRaidHelper();
	return {
		hasKey: Boolean(settings.apiKey),
		defaultChannelId: settings.defaultChannelId,
		memberChannelId: settings.memberChannelId,
		discordEvents: settings.discordEvents,
		templates: listTemplates(),
		activities: ACTIVITIES,
		instances: INSTANCES,
		images: Object.fromEntries(Object.entries(getActivityImages()).map(([key, file]) => [key, `/images/sorties/${file}`])),
		rosters: listRosters(true).map((r) => ({ id: r.id, name: r.name })),
		channels,
		channelsError
	};
};

function parseTemplate(form: FormData) {
	// Menu unique « Sortie » : « quests », « dungeon » ou « dungeon:deadmines ».
	const [activity, instanceId] = String(form.get('kind') ?? '').split(':');
	return templateSchema.safeParse({
		name: form.get('name') ?? '',
		activity,
		instanceId: instanceId ?? '',
		title: form.get('title') ?? '',
		description: form.get('description') ?? '',
		channelId: form.get('channelId'),
		weekday: form.get('weekday'),
		time: form.get('time'),
		rosterId: form.get('rosterId')
	});
}

const TEMPLATE_FIELDS = ['name', 'activity', 'instanceId', 'title', 'description', 'channelId', 'weekday', 'time', 'rosterId'];

export const actions: Actions = {
	// La clé API donne la main sur tous les événements du serveur : réservée à l'admin d'instance.
	connection: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const current = getRaidHelper();
		const newKey = String(form.get('apiKey') ?? '').trim();
		if ((newKey || form.has('removeKey')) && !isInstanceAdmin(locals)) return fail(403, { error: 'Seul l’admin d’instance peut changer la clé API.' });
		const parsed = raidHelperSchema.safeParse({
			apiKey: form.has('removeKey') ? null : newKey || current.apiKey,
			defaultChannelId: form.get('defaultChannelId') ?? '',
			memberChannelId: form.get('memberChannelId') ?? '',
			discordEvents: form.get('discordEvents') === 'on'
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		if (newKey) {
			const guildId = getDiscord()?.guildId;
			if (!guildId) return fail(400, { error: 'Configure d’abord la connexion Discord.' });
			const problem = await verifyApiKey(guildId, newKey);
			if (problem) return fail(400, { error: problem });
		}
		setRaidHelper(parsed.data);
		audit(locals, 'raidhelper.update', { label: 'Raid-Helper', url: '/admin/sorties' }, {
			cle: newKey ? 'changée' : form.has('removeKey') ? 'retirée' : undefined,
			...diff(current, parsed.data, ['defaultChannelId', 'memberChannelId', 'discordEvents'])
		});
		return { saved: true };
	},
	create: async ({ locals, request }) => {
		requireOfficer(locals);
		const parsed = parseTemplate(await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		createTemplate(parsed.data);
		audit(locals, 'outing-template.create', { label: parsed.data.name, url: '/admin/sorties' });
		return { created: true };
	},
	update: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const parsed = parseTemplate(form);
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
		const id = Number(form.get('id'));
		const before = getTemplate(id);
		if (!before) return fail(404, { error: 'Modèle introuvable.' });
		updateTemplate(id, parsed.data);
		audit(locals, 'outing-template.update', { label: parsed.data.name, url: '/admin/sorties' }, diff(before, parsed.data, TEMPLATE_FIELDS));
		return { saved: true };
	},
	image: async ({ locals, request }) => {
		requireOfficer(locals);
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		const file = form.get('image');
		if (form.has('remove')) {
			removeActivityImage(key);
		} else {
			if (!(file instanceof File) || file.size === 0) return fail(400, { imageError: 'Choisis une image.', imageKey: key });
			const problem = await saveActivityImage(key, file);
			if (problem) return fail(400, { imageError: problem, imageKey: key });
		}
		audit(locals, 'outing-image.update', { label: key, url: '/admin/sorties' }, { action: form.has('remove') ? 'retirée' : 'envoyée' });
		return { imageSaved: key };
	},
	delete: async ({ locals, request }) => {
		requireOfficer(locals);
		const template = getTemplate(Number((await request.formData()).get('id')));
		if (!template) return fail(404, { error: 'Modèle introuvable.' });
		deleteTemplate(template.id);
		audit(locals, 'outing-template.delete', { label: template.name });
		return { deleted: true };
	}
};
