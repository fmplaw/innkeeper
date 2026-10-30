import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		// Chaque fichier de test a sa propre base SQLite temporaire (voir le fichier de préparation).
		setupFiles: ['src/test/setup.ts']
	}
});
