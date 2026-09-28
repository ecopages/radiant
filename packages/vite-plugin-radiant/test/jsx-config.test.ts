import { describe, expect, test } from 'vitest';
import { createRadiantJsxConfig, createRadiantSsrExternalsPlugin } from '../src/jsx-config';

describe('createRadiantJsxConfig', () => {
	test('configures automatic Radiant JSX through OXC', () => {
		const plugin = createRadiantJsxConfig({ jsxImportSource: '@ecopages/jsx' });
		const config = plugin.config?.({}, { command: 'serve', mode: 'development' });

		expect(config).toEqual({
			oxc: {
				jsx: {
					runtime: 'automatic',
					importSource: '@ecopages/jsx',
					development: true,
				},
			},
		});
	});

	test('disables JSX development transforms in production mode', () => {
		const plugin = createRadiantJsxConfig();
		const config = plugin.config?.({}, { command: 'build', mode: 'production' });

		expect(config?.oxc?.jsx?.development).toBe(false);
	});
});

describe('createRadiantSsrExternalsPlugin', () => {
	test('dedupes and externalizes Radiant workspace packages for SSR', () => {
		const plugin = createRadiantSsrExternalsPlugin();
		const config = plugin.config?.({}, { command: 'build', mode: 'production' });

		expect(config?.resolve?.dedupe).toContain('@ecopages/signals');
		expect(config?.ssr?.external).toContain('@ecopages/radiant');
		expect(config?.optimizeDeps?.exclude).toContain('@ecopages/jsx');
	});
});
