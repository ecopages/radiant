/// <reference types="vitest" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
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
			alias: {
				'node:async_hooks': fileURLToPath(
					new URL('../../configs/async-local-storage.browser.ts', import.meta.url),
				),
			},
		},
		test: {
			name: 'e2e',
			include: ['test/**/*.e2e.test.{ts,tsx}'],
			browser: {
				enabled: true,
				headless: true,
				provider: playwright({}),
				instances: [{ browser: 'chromium' }],
			},
		},
	}),
);
