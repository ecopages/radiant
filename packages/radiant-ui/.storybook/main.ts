import type { StorybookConfig } from '@ecopages/storybook-radiant-vite/node';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	staticDirs: [path.join(dirname, 'public')],
	addons: ['@storybook/addon-vitest', '@storybook/addon-a11y', '@storybook/addon-docs'],
	framework: {
		name: '@ecopages/storybook-radiant-vite',
		options: {
			globalStyleModules: ['/src/styles/tailwind.css', '/.storybook/docs-typography.css'],
		},
	},
	async viteFinal(config) {
		config.resolve ??= {};
		config.resolve.alias = {
			...((config.resolve.alias as Record<string, string>) ?? {}),
			'@': path.join(dirname, '../src'),
			// Story-support helpers in this directory. Keep in sync with `paths` in
			// `tsconfig.app.json`. Must not be `@storybook` — that prefix shadows the real scope.
			'@sb': dirname,
		};
		config.plugins = [...(config.plugins ?? []), tailwindcss()];
		return config;
	},
};

export default config;
