export interface Config {
	siteUrl: string;
	token: string;
	/** Dossier de WoW ; vide tant qu'il n'est ni trouvé ni choisi. */
	gameDir: string;
	/** Rappels de la vérification de la clé, pour l'affichage. */
	guild: string | null;
	player: string;
	scope: 'guild' | 'own';
	/** Notification Windows après chaque envoi qui met à jour des persos. */
	notify: boolean;
}

/** Réglages relus depuis le stockage de l'application ; null s'ils sont absents ou incomplets. */
export function parseConfig(raw: unknown): Config | null {
	const c = (raw ?? {}) as Partial<Config>;
	if (typeof c.siteUrl !== 'string' || typeof c.token !== 'string' || !c.siteUrl || !c.token) return null;
	return { gameDir: '', guild: null, player: '', scope: 'own', notify: true, ...c } as Config;
}

/** Adresse du site normalisée : https par défaut, sans chemin ni barre finale. */
export function normalizeSiteUrl(input: string) {
	const raw = input.trim();
	const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
	if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) url.protocol = 'https:';
	return url.origin;
}

/**
 * Lien envoyé par le site (« Connecter InnkeeperSync ») : innkeeper://connect?site=…&token=…
 * Il n'est jamais appliqué sans confirmation : la fenêtre montre le site avant de l'accepter.
 */
export function parseConnectLink(link: string): { siteUrl: string; token: string } | null {
	try {
		const url = new URL(link);
		if (url.protocol !== 'innkeeper:' || (url.hostname || url.pathname.replace(/^\/+/, '')) !== 'connect') return null;
		const token = url.searchParams.get('token') ?? '';
		const site = url.searchParams.get('site') ?? '';
		if (!/^iks_[\w-]{20,}$/.test(token) || !site) return null;
		return { siteUrl: normalizeSiteUrl(site), token };
	} catch {
		return null;
	}
}
