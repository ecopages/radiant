/// <reference types="vitest" />
/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from 'vitest/config';
import standardConfig from './tsconfig.json';
import legacyConfig from './tsconfig.legacy.json';

const LEGACY_ENVIRONMENT = process.argv.includes('--legacy');
const tsconfigRaw = LEGACY_ENVIRONMENT ? JSON.stringify(legacyConfig) : JSON.stringify(standardConfig);

export default defineConfig({
	esbuild: {
		target: 'es2022',
		tsconfigRaw,
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
