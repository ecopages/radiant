/// <reference types="vitest" />
/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }],
		},
	},
});
