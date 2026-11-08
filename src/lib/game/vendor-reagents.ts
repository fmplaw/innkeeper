// Composants vendus par les marchands (fournitures d'artisanat de Classic) : leur prix est celui du
// marchand, que Battle.net donne pour chaque objet (purchase_price). Battle.net donne aussi un prix
// d'achat pour des objets qu'aucun marchand ne vend (Feuillargent…) : d'où cette liste fermée.
export const VENDOR_REAGENTS: Record<number, string> = {
	// Alchimie, enchantement
	3371: 'Fiole vide',
	3372: 'Fiole plombée',
	8925: 'Fiole de cristal',
	18256: 'Fiole imprégnée',
	6217: 'Bâtonnet en cuivre',
	// Couture
	2320: 'Bobine de fil grossier',
	2321: 'Bobine de fil raffiné',
	4291: 'Bobine de soie',
	8343: 'Bobine de soie lourde',
	14341: 'Fil runique',
	2324: 'Décolorant',
	2325: 'Teinture noire',
	2604: 'Teinture rouge',
	2605: 'Teinture verte',
	4340: 'Teinture grise',
	4341: 'Teinture jaune',
	4342: 'Teinture pourpre',
	6260: 'Teinture bleue',
	6261: 'Teinture orange',
	10290: 'Teinture rose',
	// Travail du cuir
	4289: 'Sel',
	// Forge, ingénierie
	2880: 'Catalyseur léger',
	3466: 'Catalyseur puissant',
	3857: 'Charbon',
	4399: 'Crosse en bois',
	4400: 'Crosse lourde',
	10647: 'Encre d’ingénieur',
	// Cuisine, feu de camp
	159: 'Eau de source',
	1179: 'Lait glacé',
	2596: 'Outre de bière naine',
	2678: 'Épices douces',
	2692: 'Épices fortes',
	3713: 'Épices apaisantes',
	4470: 'Bois simple'
};
