import { defineConfig } from 'vitest/config';
import nodeConfig from './vite.config.js';
import browserConfig from './vitest.browser.config.js';

const legacy = process.argv.includes('--legacy');
const decoratorCoverageExcludes = legacy
	? ['src/decorators/standard', 'src/context/decorators/standard']
	: ['src/decorators/legacy', 'src/context/decorators/legacy'];
const distGlobalSetup = ['./test/build/dist-global-setup.ts'];

/**
 * @remarks The `test/build` files run in their own `node-dist` and `browser-dist` projects, so their
 * `globalSetup`, which may run `build:lib`, runs only when one of them is in the run. Those projects copy the
 * `node` and `browser` configs by spread, because `mergeConfig` would concatenate `include` and `exclude`.
 */
export default defineConfig({
	test: {
		projects: [
			'./vite.config.ts',
			'./vitest.browser.config.ts',
			'./vitest.e2e.config.ts',
			{
				...nodeConfig,
				test: {
					...nodeConfig.test,
					name: 'node-dist',
					include: ['test/build/**/*.test.ts'],
					exclude: ['test/build/**/*.browser.test.ts'],
					globalSetup: distGlobalSetup,
				},
			},
			{
				...browserConfig,
				test: {
					...browserConfig.test,
					name: 'browser-dist',
					include: ['test/build/**/*.browser.test.ts'],
					exclude: [],
					globalSetup: distGlobalSetup,
				},
			},
		],
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/playground.tsx', 'src/types.ts', ...decoratorCoverageExcludes],
		},
	},
});
