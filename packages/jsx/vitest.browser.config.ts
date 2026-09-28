/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		include: ['test/**/*.browser.test.{ts,tsx}'],
	},
});
