/// <reference types="vitest" />
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig, type Plugin } from 'vitest/config';
import legacyConfig from './tsconfig.legacy.json' with { type: 'json' };
import { createRadiantVitestBase } from './vitest.shared.js';

const base = await createRadiantVitestBase({
	signalsEntry: new URL('../signals/index.ts', import.meta.url),
	legacyTsconfig: legacyConfig,
});

const radiantRuntimeVirtualModules: Plugin = {
	name: 'radiant-runtime-test-virtual-modules',
	resolveId(id) {
		return id.startsWith('virtual:radiant/') ? `\0${id}` : undefined;
	},
	load(id) {
		switch (id) {
			case '\0virtual:radiant/app-load-mode':
				return "export const resolveRadiantAppLoadMode = () => 'ssr';";
			case '\0virtual:radiant/client-module-registry':
				return 'export const loadRadiantClientModule = async () => ({});';
			case '\0virtual:radiant/dom-module-registry':
				return `export async function loadRadiantDomModules(root = document) {
	return globalThis.__radiantTestLoadRadiantDomModules?.(root) ?? [];
}`;
			default:
				return undefined;
		}
	},
};

export default mergeConfig(
	base,
	defineConfig({
		plugins: [radiantRuntimeVirtualModules],
		test: {
			name: 'vite-plugin-radiant-browser',
			include: ['../vite-plugin-radiant/test/start-radiant-app.browser.test.tsx'],
			browser: {
				enabled: true,
				headless: true,
				provider: playwright({}),
				instances: [{ browser: 'chromium' }],
			},
		},
	}),
);
