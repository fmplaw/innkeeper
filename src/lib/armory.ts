// Armurerie de Blizzard (WoW Forever) : adresse de la page d'un perso. Partagé entre serveur et navigateur.

/** Identifiant d'un perso dans l'Armurerie : « Vinshal Haal » → « vinshal-haal ». */
export const characterSlug = (name: string, surname: string | null | undefined) =>
	[name, surname]
		.map((v) => v?.trim())
		.filter(Boolean)
		.join('-')
		.toLocaleLowerCase('fr')
		.replace(/\s+/g, '-');

export const armoryUrl = (region: string, name: string, surname: string | null | undefined) =>
	`https://worldofwarcraft.blizzard.com/fr-fr/forever/${region}/armory/character/${encodeURIComponent(characterSlug(name, surname))}`;

/**
 * Lien vers la page du perso dans l'Armurerie, seulement s'il y a été trouvé (sinon la page de
 * Blizzard dirait « introuvable ») et si la guilde a connecté Battle.net (pour la région).
 */
export function armoryHref(cfg: { armoryRegion: string | null }, c: { name: string; surname: string | null; armoryStatus?: string | null }) {
	if (!cfg.armoryRegion || !c.surname || (c.armoryStatus !== 'found' && c.armoryStatus !== 'mismatch')) return null;
	return armoryUrl(cfg.armoryRegion, c.name, c.surname);
}
