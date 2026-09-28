import { defineConfig } from 'vitest/config';

const legacy = process.argv.includes('--legacy');
const decoratorCoverageExcludes = legacy
	? ['src/decorators/standard', 'src/context/decorators/standard']
	: ['src/decorators/legacy', 'src/context/decorators/legacy'];

export default defineConfig({
	test: {
		projects: ['./vite.config.ts', './vitest.browser.config.ts', './vitest.e2e.config.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/playground.tsx', 'src/types.ts', ...decoratorCoverageExcludes],
		},
	},
});
