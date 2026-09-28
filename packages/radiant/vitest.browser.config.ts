/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import legacyConfig from './tsconfig.legacy.json' with { type: 'json' };
import { createRadiantVitestBase } from './vitest.shared.js';

const base = await createRadiantVitestBase({
	signalsEntry: new URL('../signals/index.ts', import.meta.url),
	legacyTsconfig: legacyConfig,
});

export default mergeConfig(
	base,
	defineConfig({
		resolve: {
			conditions: ['browser', 'import', 'default'],
			alias: {
				'@ecopages/radiant/is-server': fileURLToPath(new URL('./src/is-server.ts', import.meta.url)),
			},
		},
		test: {
			name: 'browser',
			environment: 'happy-dom',
			include: ['test/**/*.browser.test.{ts,tsx}'],
		},
	}),
);
