/// <reference types="vitest/config" />
/// <reference types="@vitest/browser/providers/playwright" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import tailwindcss from '@tailwindcss/vite';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			'@': path.join(dirname, 'src'),
		},
	},
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: '@ecopages/jsx',
		target: 'es2022',
	},
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: path.join(dirname, '.storybook'),
					}),
				],
				test: {
					name: 'storybook',
					setupFiles: ['.storybook/vitest.setup.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
});
