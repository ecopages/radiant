/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.test.{ts,tsx}'],
		exclude: ['test/**/*.browser.test.{ts,tsx}', 'test/**/*.e2e.test.{ts,tsx}'],
	},
});
