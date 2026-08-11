/// <reference types="vitest/config" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import radiant from '@ecopages/vite-plugin-radiant';
import tailwindcss from '@tailwindcss/vite';
import { radiantUiAliases } from './.storybook/aliases.ts';

const dirname = import.meta.dirname;
const requireFromFramework = createRequire(path.join(dirname, '../storybook-radiant-vite/package.json'));

const radiantPlugins = await radiant({ elements: true, decorators: 'babel' });

export default defineConfig({
	plugins: [tailwindcss(), ...radiantPlugins],
	optimizeDeps: {
		include: ['storybook/test', 'storybook/internal/core-events', requireFromFramework.resolve('ts-dedent')],
		exclude: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react-dom/test-utils'],
	},
	resolve: {
		alias: radiantUiAliases,
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
