<script lang="ts">
	import Glyph from '$lib/components/Glyph.svelte';
	import { className, classColor } from '$lib/labels';
	import { ROLE_ICONS, ROLE_LABELS, type Role } from '$lib/roles';

	// Emblème d'un perso : l'icône de classe envoyée par la guilde, avec son rôle en pastille dans
	// le coin ; sans icône, le blason teinté par la couleur de la classe, marqué du rôle.
	// Sans rôle (filtres par classe), l'icône seule, ou la pastille de couleur.
	type Config = Parameters<typeof className>[0] & { classIcons: Record<string, string> };
	let { cfg, classId, role = null, size = 42 }: { cfg: Config; classId: string; role?: Role | null; size?: number } = $props();

	const icon = $derived(cfg.classIcons[classId]);
	const label = $derived(role ? `${className(cfg, classId)} · ${ROLE_LABELS[role]}` : className(cfg, classId));
</script>

{#if icon}
	<span class="emblem" style:width="{size}px" style:height="{size}px" title={label}>
		<img src={icon} alt={className(cfg, classId)} />
		{#if role}
			<span class="role" style:color="var(--r-{role})" style:--s="{Math.max(16, Math.round(size * 0.46))}px">
				<Glyph name={ROLE_ICONS[role]} size={Math.max(10, Math.round(size * 0.28))} />
			</span>
		{/if}
	</span>
{:else if role}
	<span class="crest" style:--c={classColor(cfg, classId)} style:width="{size}px" style:height="{size}px" title={label}>
		<Glyph name={ROLE_ICONS[role]} size={Math.round(size * 0.43)} />
	</span>
{:else}
	<span class="dot" style:--c={classColor(cfg, classId)}></span>
{/if}

<style>
	.emblem {
		position: relative;
		flex: none;
		display: block;
	}
	.emblem img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.5));
	}
	.role {
		position: absolute;
		right: -3px;
		bottom: -3px;
		display: grid;
		place-items: center;
		width: var(--s);
		height: var(--s);
		border-radius: 50%;
		background: var(--surface-2);
		box-shadow: 0 0 0 2px var(--surface);
	}
	.crest {
		flex: none;
		display: grid;
		place-items: center;
		border-radius: 28%;
		color: var(--text);
		background: color-mix(in srgb, var(--c) 16%, var(--surface));
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--c) 45%, rgb(0 0 0 / 0.3));
	}
</style>
