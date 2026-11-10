import { describe, expect, it } from 'vitest';
import { recipeTooltip, recipeUrl } from './wowhead';

describe('liens Wowhead', () => {
	it('lien de recette vers la base Forever en français', () => {
		expect(recipeUrl(2329)).toBe('https://www.wowhead.com/forever/fr/spell=2329');
	});
	it('bulle sur un lien de commande : la langue suit « fr.forever » (forever/fr la donne en anglais)', () => {
		expect(recipeTooltip(2329)).toBe('spell=2329&domain=fr.forever');
	});
});
