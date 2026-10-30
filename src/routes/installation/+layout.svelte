<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const STEPS = [
		{ path: '/installation', label: 'Compte admin' },
		{ path: '/installation/discord', label: 'Discord' },
		{ path: '/installation/guilde', label: 'Guilde' }
	];
	const current = $derived(STEPS.findIndex((s) => s.path === page.url.pathname));
</script>

<div class="setup">
	<h1>Installation</h1>
	<ol class="steps">
		{#each STEPS as step, i (step.path)}
			<li class:done={i < current} class:active={i === current}>{i + 1}. {step.label}</li>
		{/each}
	</ol>
	{@render children()}
</div>

<style>
	.setup {
		max-width: 52rem;
		margin: 0 auto;
	}
	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		color: var(--muted);
	}
	.active {
		color: var(--gold);
		font-weight: 600;
	}
	.done {
		color: var(--text);
	}
</style>
