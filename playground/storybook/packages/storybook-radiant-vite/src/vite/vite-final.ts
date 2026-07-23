import type { Options } from 'storybook/internal/types';
import type { PluginOption, UserConfig } from 'vite';
import radiant from '@ecopages/vite-plugin-radiant';
import { radiantFrameworkHmrPlugin } from './framework-hmr';
import { radiantScriptModuleStampPlugin } from './script-module-stamp';
import { radiantStorybookSsrShimPlugin } from './storybook-ssr-shim';
import { radiantStorybookSsrPlugin } from './ssr-middleware';

/**
 * Merge Radiant-specific Vite settings into Storybook's builder config.
 */
export async function viteFinal(config: UserConfig, _options: Options): Promise<UserConfig> {
	const radiantPlugins = await radiant({ elements: true, decorators: 'babel' });
	const plugins: PluginOption[] = [
		...(config.plugins ?? []),
		...radiantPlugins,
		radiantStorybookSsrShimPlugin(),
		radiantScriptModuleStampPlugin(),
		radiantStorybookSsrPlugin(),
		radiantFrameworkHmrPlugin(),
	];

	return {
		...config,
		plugins,
	};
}
