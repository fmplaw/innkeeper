<!-- Illustration par défaut quand la guilde n'a pas envoyé de bannière : crêtes teintées par l'accent. -->
<svg class="horizon" viewBox="0 0 1600 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
	<defs>
		<linearGradient id="horizon-sky" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="color-mix(in oklab, var(--accent) 7%, #14100e)" />
			<stop offset="0.5" stop-color="color-mix(in oklab, var(--accent) 14%, #2a1a18)" />
			<stop offset="0.78" stop-color="color-mix(in oklab, var(--accent) 40%, #7a3f2c)" />
			<stop offset="1" stop-color="color-mix(in oklab, var(--accent) 25%, #d9804a)" />
		</linearGradient>
		<radialGradient id="horizon-glow" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0" stop-color="#ffb27a" stop-opacity="0.7" />
			<stop offset="1" stop-color="#ffb27a" stop-opacity="0" />
		</radialGradient>
	</defs>
	<rect width="1600" height="560" fill="url(#horizon-sky)" />
	<circle cx="1120" cy="400" r="330" fill="url(#horizon-glow)" />
	<circle cx="1120" cy="402" r="58" fill="#ffd9ae" />
	<path d="M0 410 C180 350 300 400 470 372 S760 330 960 380 1300 340 1600 392 V560 H0Z" fill="color-mix(in oklab, var(--accent) 12%, #4a2a22)" />
	<path d="M0 470 C210 410 360 468 560 432 S960 410 1180 452 1460 420 1600 450 V560 H0Z" fill="color-mix(in oklab, var(--accent) 12%, #2c1c18)" />
	<path d="M0 520 C260 476 480 526 760 494 S1320 480 1600 516 V560 H0Z" fill="color-mix(in oklab, var(--accent) 1.5%, #15100c)" />
</svg>

<style>
	.horizon {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
</style>
