import { describe, expect, it } from 'vitest';
import { richText } from './format';

describe('richText', () => {
	it('échappe tout le HTML saisi', () => {
		const html = richText('<script>alert("x")</script> & <img src=x onerror=alert(1)>');
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('&amp;');
	});

	it('interprète gras, italique, retours à la ligne et paragraphes', () => {
		expect(richText('**fort** et *doux*')).toBe('<p><strong>fort</strong> et <em>doux</em></p>');
		expect(richText('ligne 1\nligne 2')).toBe('<p>ligne 1<br>ligne 2</p>');
		expect(richText('un\n\ndeux')).toBe('<p>un</p><p>deux</p>');
	});

	it('ne laisse pas passer de HTML à travers la mise en forme', () => {
		expect(richText('**<b onclick=x>**')).toBe('<p><strong>&lt;b onclick=x&gt;</strong></p>');
	});

	it('ignore les paragraphes vides', () => {
		expect(richText('\n\n  \n\n')).toBe('');
	});
});
