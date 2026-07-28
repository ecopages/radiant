/// <reference types="vitest" />
/// <reference types="@vitest/browser/providers/playwright" />
import tailwindcss from '@tailwindcss/vite';
import { radiant } from '@ecopages/vite-plugin-radiant';
import { defineConfig } from 'vitest/config';
import standardConfig from './tsconfig.json';
import legacyConfig from './tsconfig.legacy.json';

const LEGACY_ENVIRONMENT = process.argv.includes('--legacy');
const tsconfigRaw = LEGACY_ENVIRONMENT ? JSON.stringify(legacyConfig) : JSON.stringify(standardConfig);

export default defineConfig({
	plugins: [tailwindcss(), ...radiant()],
	esbuild: {
		target: 'es2022',
		tsconfigRaw,
	},
	resolve: {
		dedupe: ['@ecopages/jsx', '@ecopages/radiant', '@ecopages/signals'],
	},
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }],
		},
	},
});
