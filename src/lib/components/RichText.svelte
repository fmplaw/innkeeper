<script lang="ts">
	import { richText } from '$lib/format';

	// Texte mis en forme par la guilde (charte, présentation…), avec titres et listes.
	// `document` : mise en page d'un long texte (charte) ; parties séparées, sous-parties en encadrés.
	let { text, document = false }: { text: string; document?: boolean } = $props();
</script>

<div class="rich" class:document>{@html richText(text)}</div>

<style>
	.rich {
		line-height: 1.65;
	}
	.rich :global(h2) {
		margin: 1.5rem 0 0.5rem;
		font-size: 1.25rem;
		color: var(--gold);
	}
	.rich :global(h3) {
		margin: 1.25rem 0 0.4rem;
		font-size: 1.05rem;
		color: var(--gold);
	}
	.rich :global(:is(h2, h3):first-child) {
		margin-top: 0;
	}
	.rich :global(p),
	.rich :global(ul) {
		margin: 0 0 0.8rem;
	}
	.rich :global(ul) {
		padding-left: 1.25rem;
	}
	.rich :global(li + li) {
		margin-top: 0.25rem;
	}
	.rich :global(:last-child) {
		margin-bottom: 0;
	}
	.rich :global(strong) {
		color: color-mix(in srgb, var(--accent) 45%, white);
	}

	/* Document : chaque partie ouvre par un titre souligné, les sous-parties forment une grille d'encadrés. */
	.document {
		display: grid;
		gap: 2.25rem;
	}
	.document > :global(p:first-child) {
		margin: 0;
		font-size: 1.05rem;
		color: var(--text);
	}
	.document :global(section) {
		display: grid;
		gap: 0.75rem;
	}
	.document :global(section > *) {
		margin: 0;
	}
	.document :global(h2) {
		margin: 0;
		padding-bottom: 0.45rem;
		font-size: 1.4rem;
		letter-spacing: 0.01em;
		border-bottom: 1px solid color-mix(in srgb, var(--gold) 35%, var(--border));
	}
	.document :global(.subs) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
		gap: 0.9rem;
	}
	.document :global(.subs > section) {
		align-content: start;
		gap: 0.4rem;
		padding: 0.9rem 1rem 1rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-top: 2px solid color-mix(in srgb, var(--accent) 70%, var(--border));
		border-radius: 8px;
	}
	.document :global(h3) {
		margin: 0;
		font-size: 1.02rem;
		color: var(--text);
		letter-spacing: 0.02em;
	}
	.document :global(.subs p),
	.document :global(.subs li) {
		color: color-mix(in srgb, var(--text) 85%, var(--muted));
		font-size: 0.95rem;
	}
	.document :global(ul) {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.45rem;
	}
	.document :global(li) {
		position: relative;
		margin: 0;
		padding-left: 1.1rem;
	}
	/* Devise finale : bandeau sur toute la largeur, en bas du texte. */
	.document :global(.motto) {
		text-align: center;
		margin: 0;
		padding: 1rem 1.25rem;
		border-block: 1px solid color-mix(in srgb, var(--gold) 35%, var(--border));
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		font-size: 1.2rem;
		letter-spacing: 0.04em;
	}
	.document :global(.motto strong) {
		color: var(--gold);
	}
	.document :global(li + li) {
		margin-top: 0;
	}
	.document :global(li::before) {
		content: '';
		position: absolute;
		left: 0.15rem;
		top: 0.62em;
		width: 0.38rem;
		height: 0.38rem;
		background: var(--gold);
		transform: rotate(45deg);
	}
</style>
