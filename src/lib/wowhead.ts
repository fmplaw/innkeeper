// Liens vers la base de Forever de Wowhead, en français. Les recettes exportées par l'addon
// sont des sorts du jeu (identifiant de C_TradeSkillUI). La langue suit le nom de la base
// (/forever/fr/) : le script des bulles ne la lit pas dans un sous-domaine fr.wowhead.com.
export const WOWHEAD_FOREVER = 'https://www.wowhead.com/forever/fr';

export const recipeUrl = (id: number) => `${WOWHEAD_FOREVER}/spell=${id}`;

/** Bulle du jeu sur un lien qui ne mène pas à Wowhead (attribut data-wowhead). Ici le script lit
 * « fr.forever » (domain=forever/fr donne la bulle en anglais : vérifié sur la démo le 10/11/2026). */
export const recipeTooltip = (id: number) => `spell=${id}&domain=fr.forever`;

/** Petite icône du jeu (18 px) chez Wowhead, d'après le nom de fichier gardé par le site. */
export const recipeIconUrl = (icon: string) => `https://wow.zamimg.com/images/wow/icons/small/${icon}.jpg`;
