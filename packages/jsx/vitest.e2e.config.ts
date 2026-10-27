/// <reference types="vitest" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			'node:async_hooks': fileURLToPath(new URL('../../configs/async-local-storage.browser.ts', import.meta.url)),
		},
	},
	test: {
		include: ['test/**/*.e2e.test.{ts,tsx}'],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright({}),
			instances: [{ browser: 'chromium' }],
		},
	},
});
