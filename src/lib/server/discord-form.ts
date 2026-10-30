import { verifyApp, verifyBot } from './discord';
import { discordSchema, type DiscordSettings } from './settings';

/**
 * Lit le formulaire de connexion Discord et vérifie les identifiants auprès de Discord.
 * Une clé secrète ou un token laissé vide conserve la valeur enregistrée.
 */
export async function parseDiscordForm(form: FormData, current: DiscordSettings | null) {
	const str = (key: string) => String(form.get(key) ?? '').trim();
	const raw = {
		clientId: str('clientId'),
		clientSecret: str('clientSecret') || current?.clientSecret || '',
		guildId: str('guildId'),
		botToken: form.get('removeBot') === 'on' ? null : str('botToken') || current?.botToken || null
	};
	// Valeurs renvoyées au formulaire en cas d'erreur : jamais les secrets.
	const values = { clientId: raw.clientId, guildId: raw.guildId, hasSecret: Boolean(raw.clientSecret), hasBot: Boolean(raw.botToken) };

	const result = discordSchema.safeParse(raw);
	if (!result.success) {
		const errors: Record<string, string> = {};
		for (const issue of result.error.issues) errors[String(issue.path[0] ?? 'form')] ??= issue.message;
		return { errors, values } as const;
	}

	const appError = await verifyApp(result.data.clientId, result.data.clientSecret).catch(() => 'Discord est injoignable.');
	if (appError) return { errors: { clientSecret: appError }, values } as const;
	if (result.data.botToken) {
		const botError = await verifyBot(result.data.botToken).catch(() => 'Discord est injoignable.');
		if (botError) return { errors: { botToken: botError }, values } as const;
	}
	return { data: result.data } as const;
}

/** Valeurs affichables du réglage Discord (sans les secrets). */
export function discordFormValues(d: DiscordSettings | null) {
	return d ? { clientId: d.clientId, guildId: d.guildId, hasSecret: true, hasBot: Boolean(d.botToken) } : {};
}
