/// <reference types="vitest" />
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
		test: {
			name: 'node',
			environment: 'node',
			testTimeout: 15_000,
			include: ['test/**/*.test.{ts,tsx}'],
			exclude: ['test/**/*.browser.test.{ts,tsx}', 'test/**/*.e2e.test.{ts,tsx}'],
		},
	}),
);
