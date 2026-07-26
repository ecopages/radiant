import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		preset: 'src/preset.ts',
		'renderer-preset': 'src/renderer-preset.ts',
		preview: 'src/preview.ts',
		'entry-preview': 'src/entry-preview.ts',
		'node/index': 'src/node/index.ts',
	},
	format: ['esm'],
	dts: false,
	splitting: true,
	sourcemap: true,
	clean: true,
	target: 'node18',
	platform: 'neutral',
	external: [
		'storybook',
		'storybook/internal/types',
		'storybook/preview-api',
		'storybook/theming',
		'@storybook/builder-vite',
		'@storybook/global',
		'@ecopages/jsx',
		'@ecopages/jsx/client',
		'@ecopages/radiant',
		'@ecopages/radiant/client/install-hydrator',
		'@ecopages/radiant/server/install-ssr-runtime',
		'@ecopages/radiant/server/render-component',
		'@ecopages/signals',
		'vite',
		'@ecopages/vite-plugin-radiant',
		'virtual:radiant/dom-module-registry',
		'ts-dedent',
	],
	esbuildOptions(options) {
		options.platform = 'neutral';
	},
});
