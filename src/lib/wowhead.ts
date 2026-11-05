// Liens vers la base de Forever de Wowhead, en français. Les recettes exportées par l'addon
// sont des sorts du jeu (identifiant de C_TradeSkillUI).
export const WOWHEAD_FOREVER = 'https://fr.wowhead.com/forever';

export const recipeUrl = (id: number) => `${WOWHEAD_FOREVER}/spell=${id}`;
