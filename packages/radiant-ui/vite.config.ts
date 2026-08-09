/// <reference types="vitest/config" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import radiant from '@ecopages/vite-plugin-radiant';
import tailwindcss from '@tailwindcss/vite';

const dirname = import.meta.dirname;

const radiantPlugins = await radiant({ elements: true, decorators: 'babel' });

export default defineConfig({
	plugins: [tailwindcss(), ...radiantPlugins],
	optimizeDeps: {
		include: ['storybook/test', 'storybook/internal/core-events', 'ts-dedent'],
	},
	resolve: {
		alias: {
			'@': path.join(dirname, 'src'),
		},
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
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['src/**/*.test.{ts,tsx}'],
					exclude: ['src/**/*.ssr.test.{ts,tsx}'],
					setupFiles: ['.storybook/vitest.unit.setup.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
			{
				extends: true,
				test: {
					name: 'ssr',
					include: ['src/**/*.ssr.test.{ts,tsx}'],
					environment: 'happy-dom',
				},
			},
		],
	},
});
