import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	publicDir: fileURLToPath(new URL('./src/public', import.meta.url)),
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'node',
					environment: 'node',
					include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
				},
			},
			{
				extends: true,
				test: {
					name: 'browser',
					include: ['src/**/*.test.browser.{ts,tsx}', 'test/**/*.test.browser.{ts,tsx}'],
					exclude: ['test/**/*-voice-memo-*.test.browser.ts', '**/node_modules/**'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
			{
				extends: true,
				test: {
					name: 'browser-media',
					include: ['test/**/*-voice-memo-*.test.browser.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({
							launchOptions: {
								args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
							},
						}),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
});
