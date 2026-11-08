import { describe, expect, it } from 'vitest';
import { formatMoney, readMoney } from './money';

const formData = (values: Record<string, string>) => {
	const form = new FormData();
	for (const [k, v] of Object.entries(values)) form.append(k, v);
	return form;
};

describe('pièces du jeu', () => {
	it('affiche po, pa, pc', () => {
		expect(formatMoney(15_035)).toBe('1 po 50 pa 35 pc');
		expect(formatMoney(1000)).toBe('10 pa');
		expect(formatMoney(null)).toBe('');
	});

	it('lit les trois cases d’un formulaire', () => {
		expect(readMoney(formData({ priceGold: '1', priceSilver: '50', priceCopper: '' }), 'price')).toEqual({ value: 15_000 });
		expect(readMoney(formData({ priceGold: '', priceSilver: '', priceCopper: '' }), 'price')).toEqual({ value: null });
		expect(readMoney(formData({ priceGold: '0' }), 'price')).toEqual({ value: null });
		expect(readMoney(formData({ priceSilver: '-3' }), 'price')).toHaveProperty('error');
		expect(readMoney(formData({ priceSilver: '1.5' }), 'price')).toHaveProperty('error');
	});
});
