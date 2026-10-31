const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const inline = (line: string) => line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

/**
 * Texte saisi par la guilde → HTML sûr : tout est échappé, puis seuls **gras**, *italique*,
 * titres (`# `, `## `), listes (`- `), retours à la ligne et paragraphes (ligne vide) sont interprétés.
 */
export function richText(text: string) {
	const escaped = text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
	const blocks: { tag: 'h2' | 'h3' | 'p' | 'ul'; html: string }[] = [];
	for (const block of escaped.split(/\n\s*\n/)) {
		// Dans un bloc : les titres et les listes coupent le texte, le reste forme des paragraphes.
		let lines: string[] = [];
		let items: string[] = [];
		const flush = () => {
			if (lines.length) blocks.push({ tag: 'p', html: `<p>${lines.map(inline).join('<br>')}</p>` });
			if (items.length) blocks.push({ tag: 'ul', html: `<ul>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>` });
			lines = [];
			items = [];
		};
		for (const raw of block.split('\n')) {
			const line = raw.trim();
			if (!line) continue;
			const heading = /^(#{1,2})\s+(.+)$/.exec(line);
			const item = /^[-•]\s+(.+)$/.exec(line);
			if (heading) {
				flush();
				const tag = heading[1].length === 1 ? 'h2' : 'h3';
				blocks.push({ tag, html: `<${tag}>${inline(heading[2])}</${tag}>` });
			} else if (item) {
				if (lines.length) flush();
				items.push(item[1]);
			} else {
				if (items.length) flush();
				lines.push(line);
			}
		}
		flush();
	}
	// Une dernière ligne entièrement en gras (une devise), après d'autres blocs, clôt le texte hors des parties.
	const last = blocks.at(-1);
	const motto = blocks.length > 1 && last?.tag === 'p' && /^<p><strong>[^<]*<\/strong><\/p>$/.test(last.html) ? blocks.pop()! : null;
	return sections(blocks) + (motto ? motto.html.replace('<p>', '<p class="motto">') : '');
}

/**
 * Regroupe les blocs par titre, pour pouvoir les mettre en page : une partie (`#`) devient une
 * <section>, et ses sous-parties (`##`) successives des <section> réunies dans un <div class="subs">.
 */
function sections(blocks: { tag: string; html: string }[]) {
	const out: string[] = [];
	let part = false;
	let subs = false;
	let sub = false;
	const closeSub = () => {
		if (sub) out.push('</section>');
		sub = false;
	};
	const closeSubs = () => {
		closeSub();
		if (subs) out.push('</div>');
		subs = false;
	};
	for (const b of blocks) {
		if (b.tag === 'h2') {
			closeSubs();
			if (part) out.push('</section>');
			out.push('<section>', b.html);
			part = true;
		} else if (b.tag === 'h3') {
			closeSub();
			if (!subs) out.push('<div class="subs">');
			out.push('<section>', b.html);
			subs = sub = true;
		} else out.push(b.html);
	}
	closeSubs();
	if (part) out.push('</section>');
	return out.join('');
}
