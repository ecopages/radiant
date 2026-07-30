import type { StorybookConfig } from '@ecopages/storybook-radiant-vite/node';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** Resolve package roots for pnpm / monorepo (Storybook loads presets from its own install). */
function getAbsolutePath(value: string): string {
	return path.dirname(require.resolve(`${value}/package.json`));
}

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	staticDirs: [
		{
			from: path.join(dirname, '../../../apps/docs/src/public'),
			to: '/',
		},
	],
	addons: ['@storybook/addon-vitest', '@storybook/addon-a11y', '@storybook/addon-docs'],
	framework: {
		name: getAbsolutePath('@ecopages/storybook-radiant-vite'),
		options: {
			globalStyleModules: ['/src/styles/tailwind.css', '/.storybook/docs-typography.css'],
		},
	},
	async viteFinal(config) {
		config.resolve ??= {};
		config.resolve.alias = {
			...((config.resolve.alias as Record<string, string>) ?? {}),
			'@': path.join(dirname, '../src'),
		};
		config.plugins = [...(config.plugins ?? []), tailwindcss()];
		return config;
	},
};

export default config;
