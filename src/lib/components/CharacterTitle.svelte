<script lang="ts">
	import Glyph from '$lib/components/Glyph.svelte';
	import { className, classColor, raceName, specRole } from '$lib/labels';
	import { ROLE_ICONS, ROLE_LABELS, type Role } from '$lib/roles';
	import type { Snippet } from 'svelte';

	// En-tête d'un perso : rôle sur un blason teinté par la classe, nom, puis niveau, race, classe et spé.
	type Config = Parameters<typeof className>[0];
	let {
		cfg,
		character: c,
		big = false,
		children
	}: {
		cfg: Config;
		character: { name: string; surname: string | null; class: string; spec: string | null; role: Role; race: string | null; level: number };
		big?: boolean;
		children?: Snippet;
	} = $props();
</script>

<div class="title" class:big>
	<span class="crest" style:--c={classColor(cfg, c.class)} title={ROLE_LABELS[c.role]}><Glyph name={ROLE_ICONS[c.role]} size={big ? 22 : 18} /></span>
	<div class="id">
		<h2><span class="name">{c.name}</span>{#if c.surname}{' '}<span class="surname">{c.surname}</span>{/if}</h2>
		<span class="meta">Niv. {c.level}{#if c.race}{' '}{raceName(cfg, c.race)}{/if} {className(cfg, c.class)} · {specRole(cfg, c.class, c.spec, c.role)}</span>
	</div>
	{#if children}<div class="extra">{@render children()}</div>{/if}
</div>

<style>
	.title {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.875rem;
	}
	.crest {
		flex: none;
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 12px;
		color: var(--text);
		background: color-mix(in srgb, var(--c) 16%, var(--surface));
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--c) 45%, rgb(0 0 0 / 0.3));
	}
	.big .crest {
		width: 52px;
		height: 52px;
		border-radius: 14px;
	}
	.id {
		display: grid;
		flex: 1;
		min-width: 12rem;
		line-height: 1.3;
	}
	h2 {
		margin: 0;
		font-family: var(--font-body);
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: 0;
	}
	.big h2 {
		font-family: var(--font-display);
		font-size: 1.5rem;
	}
	.surname {
		color: var(--muted);
		font-weight: 400;
		font-size: 0.875em;
	}
	.meta {
		color: var(--muted);
		font-size: 0.875rem;
	}
	.extra {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.375rem;
	}
</style>
