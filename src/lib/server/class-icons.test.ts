import { describe, expect, it } from 'vitest';
import { classIconUrls, publishedClassIcon, removeClassIcon, saveClassIcon } from './class-icons';
import { publicConfig } from './config';

// Signature PNG suivie de zéros : assez pour passer pour une image.
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const png = (bytes = 10) => {
	const data = new Uint8Array(Math.max(bytes, PNG.length));
	data.set(PNG);
	return new File([data], 'a.png', { type: 'image/png' });
};

describe('icônes de classe', () => {
	it('s’enregistrent par classe, arrivent dans la config publique et se retirent', async () => {
		expect(await saveClassIcon('shaman', png())).toBeNull();
		const url = classIconUrls().shaman;
		expect(url).toMatch(/^\/images\/classes\/classe-shaman-\d+\.png$/);
		expect(publicConfig().classIcons.shaman).toBe(url);
		expect(publishedClassIcon(url.split('/').pop()!)).toBeDefined();
		removeClassIcon('shaman');
		expect(publicConfig().classIcons.shaman).toBeUndefined();
	});

	it('refuse classe inconnue, format et taille, et ne sert que les fichiers enregistrés', async () => {
		expect(await saveClassIcon('deathknight', png())).toMatch(/inconnue/);
		expect(await saveClassIcon('mage', new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/Format/);
		expect(await saveClassIcon('mage', png(600 * 1024))).toMatch(/lourde/);
		// Type annoncé par le navigateur, mais contenu d'un autre genre (page HTML renommée…).
		expect(await saveClassIcon('mage', new File(['<html><script>alert(1)</script>'], 'a.png', { type: 'image/png' }))).toMatch(/Format/);
		expect(publishedClassIcon('../guilde.db')).toBeUndefined();
	});
});
