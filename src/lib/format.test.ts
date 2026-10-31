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

	it('interprète titres et listes, sans casser le texte autour', () => {
		expect(richText('# Règlement\n## Respect\nPour chacun.')).toBe(
			'<section><h2>Règlement</h2><div class="subs"><section><h3>Respect</h3><p>Pour chacun.</p></section></div></section>'
		);
		expect(richText('Les salons :\n- **bienvenue** : lecture seule\n- annonces\nMerci !')).toBe(
			'<p>Les salons :</p><ul><li><strong>bienvenue</strong> : lecture seule</li><li>annonces</li></ul><p>Merci !</p>'
		);
		// Un tiret ou un dièse au milieu d'une phrase reste du texte.
		expect(richText('Niveau 1 - 60, salon #général')).toBe('<p>Niveau 1 - 60, salon #général</p>');
		expect(richText('## <i>x</i>')).toBe('<div class="subs"><section><h3>&lt;i&gt;x&lt;/i&gt;</h3></section></div>');
	});

	it('regroupe les parties et leurs sous-parties pour la mise en page', () => {
		const html = richText('Intro.\n\n# Valeurs\nOn y tient.\n## Respect\nToujours.\n## Entraide\n- Aider\n# Salons\nTexte.');
		expect(html).toBe(
			'<p>Intro.</p>' +
				'<section><h2>Valeurs</h2><p>On y tient.</p><div class="subs">' +
				'<section><h3>Respect</h3><p>Toujours.</p></section><section><h3>Entraide</h3><ul><li>Aider</li></ul></section>' +
				'</div></section>' +
				'<section><h2>Salons</h2><p>Texte.</p></section>'
		);
	});

	it('sort une devise finale (ligne en gras) des parties', () => {
		expect(richText('# Salons\n## Vocaux\nLibres.\n\n**Gloire à la Horde !**')).toBe(
			'<section><h2>Salons</h2><div class="subs"><section><h3>Vocaux</h3><p>Libres.</p></section></div></section>' +
				'<p class="motto"><strong>Gloire à la Horde !</strong></p>'
		);
		// Du gras au milieu d'une phrase n'est pas une devise.
		expect(richText('Fin avec **du gras** dedans.')).toBe('<p>Fin avec <strong>du gras</strong> dedans.</p>');
	});

	it('ignore les paragraphes vides', () => {
		expect(richText('\n\n  \n\n')).toBe('');
	});
});
