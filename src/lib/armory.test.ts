import { describe, expect, it } from 'vitest';
import { armoryHref, armoryUrl, characterSlug } from './armory';

describe('liens vers l’Armurerie', () => {
	it('construit l’adresse du perso, accents et caractères spéciaux compris', () => {
		expect(characterSlug('Vinshal', 'Haal')).toBe('vinshal-haal');
		expect(armoryUrl('eu', 'Arthurø', 'Bragaa')).toBe('https://worldofwarcraft.blizzard.com/fr-fr/forever/eu/armory/character/arthur%C3%B8-bragaa');
	});

	it('seulement pour un perso trouvé, avec Battle.net connecté', () => {
		const cfg = { armoryRegion: 'eu' };
		expect(armoryHref(cfg, { name: 'Lin', surname: 'Dorya', armoryStatus: 'found' })).toContain('/armory/character/lin-dorya');
		expect(armoryHref(cfg, { name: 'Lin', surname: 'Dorya', armoryStatus: 'mismatch' })).not.toBeNull();
		expect(armoryHref(cfg, { name: 'Lin', surname: 'Dorya', armoryStatus: 'missing' })).toBeNull();
		expect(armoryHref(cfg, { name: 'Lin', surname: null, armoryStatus: 'found' })).toBeNull();
		expect(armoryHref({ armoryRegion: null }, { name: 'Lin', surname: 'Dorya', armoryStatus: 'found' })).toBeNull();
	});
});
