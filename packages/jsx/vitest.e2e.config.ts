/// <reference types="vitest" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
