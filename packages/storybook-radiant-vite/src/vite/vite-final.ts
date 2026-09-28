import type { Options } from 'storybook/internal/types';
import type { PluginOption, UserConfig } from 'vite';
import radiant from '@ecopages/vite-plugin-radiant';
import type { FrameworkOptions } from '../types';
import { radiantFrameworkHmrPlugin } from './framework-hmr';
import { radiantScriptModuleStampPlugin } from './script-module-stamp';
import { radiantSsrRuntimePlugin } from './ssr-runtime';
import { radiantSsrPreviewGlobalsPlugin } from './ssr-preview-globals';
import { radiantStorybookSsrPlugin } from './ssr-middleware';

/**
 * Merge Radiant-specific Vite settings into Storybook's builder config.
 */
export async function viteFinal(config: UserConfig, options: Options): Promise<UserConfig> {
	const frameworkOptions = await options.presets.apply<FrameworkOptions>('frameworkOptions');
	const radiantPlugins = await radiant({ elements: true, decorators: 'babel' });
	const plugins: PluginOption[] = [
		...(config.plugins ?? []),
		...radiantPlugins,
		radiantSsrRuntimePlugin(),
		radiantSsrPreviewGlobalsPlugin(),
		radiantScriptModuleStampPlugin(),
		radiantStorybookSsrPlugin({ globalStyleModules: frameworkOptions?.globalStyleModules }),
		radiantFrameworkHmrPlugin(),
	];

	return {
		...config,
		plugins,
	};
}
