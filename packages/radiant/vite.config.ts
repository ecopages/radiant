/// <reference types="vitest" />
/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import legacyConfig from './tsconfig.legacy.json' with { type: 'json' };
import { createRadiantVitestBase, isRadiantLegacyVitestLane } from './vitest.shared.js';

const legacy = isRadiantLegacyVitestLane();
const decoratorCoverageExcludes = legacy
	? ['src/decorators/standard', 'src/context/decorators/standard']
	: ['src/decorators/legacy', 'src/context/decorators/legacy'];

const base = await createRadiantVitestBase({
	signalsEntry: new URL('../signals/index.ts', import.meta.url),
	legacyTsconfig: legacyConfig,
});

export default mergeConfig(
	base,
	defineConfig({
		resolve: {
			conditions: ['node', 'import', 'default'],
			alias: {
				'@ecopages/radiant/is-server': fileURLToPath(new URL('./src/is-server-node.ts', import.meta.url)),
			},
		},
		test: {
			name: 'node',
			environment: 'node',
			testTimeout: 15_000,
			include: ['test/**/*.test.{ts,tsx}'],
			exclude: ['test/**/*.browser.test.{ts,tsx}', 'test/**/*.e2e.test.{ts,tsx}'],
			coverage: {
				provider: 'istanbul',
				include: ['src/**/*.{ts,tsx}'],
				exclude: ['src/playground.tsx', 'src/types.ts', ...decoratorCoverageExcludes],
			},
		},
	}),
);
