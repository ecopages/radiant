/// <reference types="vitest" />
/// <reference types="@vitest/browser/providers/playwright" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import standardConfig from './tsconfig.json';
import legacyConfig from './tsconfig.legacy.json';

const LEGACY_ENVIRONMENT = process.argv.includes('--legacy');
const tsconfigRaw = LEGACY_ENVIRONMENT ? JSON.stringify(legacyConfig) : JSON.stringify(standardConfig);
const signalsPackageEntry = fileURLToPath(new URL('../signals/index.ts', import.meta.url));

export default defineConfig({
	define: {
		__LEGACY_ENVIRONMENT__: JSON.stringify(LEGACY_ENVIRONMENT),
	},
	esbuild: {
		target: 'es2022',
		tsconfigRaw,
	},
	resolve: {
		alias: {
			'@ecopages/signals': signalsPackageEntry,
		},
	},
	test: {
		include: ['test/**/*.e2e.test.{ts,tsx}'],
		browser: {
			enabled: true,
			headless: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }],
		},
	},
});
