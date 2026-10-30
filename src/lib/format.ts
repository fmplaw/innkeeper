const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Texte saisi par la guilde → HTML sûr : tout est échappé, puis seuls **gras**,
 * *italique*, retours à la ligne et paragraphes (ligne vide) sont interprétés.
 */
export function richText(text: string) {
	const escaped = text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
	return escaped
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean)
		.map(
			(p) =>
				`<p>${p
					.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
					.replace(/\*(.+?)\*/g, '<em>$1</em>')
					.replace(/\n/g, '<br>')}</p>`
		)
		.join('');
}
