import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		environment: 'happy-dom',
		include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'src/**/*.test.browser.{ts,tsx}'],
	},
});
