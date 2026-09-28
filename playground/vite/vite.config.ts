/// <reference types="vitest" />
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { radiant } from '@ecopages/vite-plugin-radiant';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), ...radiant()],
	resolve: {
		dedupe: ['@ecopages/jsx', '@ecopages/radiant', '@ecopages/signals'],
	},
	test: {
		browser: {
			enabled: true,
			headless: true,
			provider: playwright({}),
			instances: [{ browser: 'chromium' }],
		},
	},
});
