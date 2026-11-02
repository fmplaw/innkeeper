<script lang="ts">
	import { getActivity } from '$lib/activities';

	// Médaillon du type de sortie, dans l'esprit de la légende de la carte du jeu (dessins propres
	// au projet, pas d'image de Blizzard) : anneau doré, « ! » des quêtes, vortex bleu des donjons,
	// vortex vert des raids, épées du PvP, pelle du farm, « … » pour le reste.
	// Sans type (sortie créée sur Discord), le « … ».
	let { activity = null, size = 44 }: { activity?: string | null; size?: number } = $props();

	// Identifiants propres à chaque médaillon : plusieurs dégradés sur la même page.
	const uid = $props.id();
	const id = (name: string) => `${uid}-${name}`;
	const ref = (name: string) => `url(#${id(name)})`;

	const kind = $derived(getActivity(activity)?.id ?? 'other');
	const label = $derived(getActivity(activity)?.name ?? 'Autre');
	const VORTEX = {
		dungeon: { light: '#9fe3ff', mid: '#1f7fd6', core0: '#14466e', core1: '#03101d' },
		raid: { light: '#c8ff8a', mid: '#3fa81e', core0: '#25551a', core1: '#051204' }
	};
	const vortex = $derived(kind === 'dungeon' || kind === 'raid' ? VORTEX[kind] : null);
	const ARM = 'M22 22 C21 14.5 27.5 10 33.5 13.5 C28.5 12.6 24.6 15.6 24.4 21.6 Z';
	const THIN = 'M22 22 C23.5 16.5 28 14.5 31.5 16.8 C27.6 16.2 25 18.2 23.6 22.4 Z';
</script>

<svg class="outing-icon" width={size} height={size} viewBox="0 0 44 44" role="img" aria-label={label}>
	<defs>
		<radialGradient id={id('ring')} cx="38%" cy="30%" r="75%">
			<stop offset="0" stop-color="#fff2bf" /><stop offset="0.45" stop-color="#d9a441" /><stop offset="1" stop-color="#5e3d0e" />
		</radialGradient>
		<radialGradient id={id('core')} cx="50%" cy="40%" r="65%">
			{#if vortex}
				<stop offset="0" stop-color={vortex.core0} /><stop offset="1" stop-color={vortex.core1} />
			{:else if kind === 'other'}
				<stop offset="0" stop-color="#4a2a12" /><stop offset="1" stop-color="#120804" />
			{:else}
				<stop offset="0" stop-color="#2c3340" /><stop offset="1" stop-color="#07080b" />
			{/if}
		</radialGradient>
		<linearGradient id={id('yellow')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff59a" /><stop offset="0.55" stop-color="#ffd000" /><stop offset="1" stop-color="#d98a00" />
		</linearGradient>
		<linearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#ffffff" /><stop offset="1" stop-color="#8a96a8" />
		</linearGradient>
		{#if vortex}
			<linearGradient id={id('arm')} x1="0" y1="1" x2="1" y2="0">
				<stop offset="0" stop-color="#ffffff" /><stop offset="0.35" stop-color={vortex.light} /><stop offset="1" stop-color={vortex.mid} />
			</linearGradient>
			<radialGradient id={id('eye')} cx="50%" cy="50%" r="50%">
				<stop offset="0" stop-color="#ffffff" /><stop offset="0.45" stop-color={vortex.light} /><stop offset="1" stop-color={vortex.mid} stop-opacity="0" />
			</radialGradient>
		{/if}
		<filter id={id('glow')} x="-40%" y="-40%" width="180%" height="180%">
			<feGaussianBlur stdDeviation="1.4" result="b" />
			<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
		</filter>
	</defs>

	<circle cx="22" cy="22" r="21" fill="#000" opacity="0.45" />
	<circle cx="22" cy="22" r="20" fill={ref('ring')} stroke="#3a2507" stroke-width="1" />
	<circle cx="22" cy="22" r="15.5" fill={ref('core')} stroke="#2a1a05" stroke-width="1.2" />

	{#if vortex}
		<g filter={ref('glow')}>
			{#each [60, 180, 300] as a (a)}<path d={THIN} fill={vortex.light} opacity="0.55" transform="rotate({a} 22 22)" />{/each}
			{#each [0, 120, 240] as a (a)}<path d={ARM} fill={ref('arm')} transform="rotate({a} 22 22)" />{/each}
			<circle cx="22" cy="22" r="5.5" fill={ref('eye')} />
		</g>
	{:else if kind === 'quests'}
		<g filter={ref('glow')}>
			<path d="M18.6 10.5 h6.8 l-1.5 15.5 h-3.8 z" fill={ref('yellow')} stroke="#5a3400" stroke-width="1.3" stroke-linejoin="round" />
			<circle cx="22" cy="31" r="3.3" fill={ref('yellow')} stroke="#5a3400" stroke-width="1.3" />
		</g>
	{:else if kind === 'pvp'}
		<g stroke-linecap="round">
			<path d="M13 12 L28.5 27.5 M31 12 L15.5 27.5" stroke={ref('steel')} stroke-width="3.2" />
			<path d="M25.5 31.5 L32 25 M12 25 L18.5 31.5" stroke="#d9a441" stroke-width="3" />
			<path d="M29.5 29.5 L32.5 32.5 M14.5 29.5 L11.5 32.5" stroke="#b02a1c" stroke-width="3" />
		</g>
	{:else if kind === 'farm'}
		<g transform="rotate(35 22 22)" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 10.5 L26 10.5 M22 10.5 L22 23.5" stroke="#3b2410" stroke-width="4.5" />
			<path d="M18 10.5 L26 10.5 M22 10.5 L22 23.5" stroke="#c48a4a" stroke-width="2.9" />
			<rect x="19.6" y="21.5" width="4.8" height="3.4" rx="0.8" fill="#6d7584" stroke="#22262d" stroke-width="0.9" />
			<path d="M16.6 24.6 H27.4 V28.6 C27.4 32 25 34.2 22 36 C19 34.2 16.6 32 16.6 28.6 Z" fill={ref('steel')} stroke="#22262d" stroke-width="1.2" />
			<path d="M19.2 26.4 V29.4" stroke="#ffffff" stroke-width="1.3" opacity="0.85" />
		</g>
	{:else}
		{#each [15.5, 22, 28.5] as x (x)}<circle cx={x} cy="22" r="2.6" fill={ref('yellow')} />{/each}
	{/if}

	<path d="M9 15 A15 15 0 0 1 30 7.5" fill="none" stroke="#fff6d0" stroke-width="1.2" opacity="0.7" stroke-linecap="round" />
</svg>

<style>
	.outing-icon {
		flex: none;
		display: block;
	}
</style>
