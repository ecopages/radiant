import type { Plugin } from 'vite';
import { createRadiantDecoratorBabelPlugin } from './decorators';
import { radiantElements, type RadiantElementsPluginOptions } from './elements';
import { createRadiantJsxConfig, createRadiantSsrExternalsPlugin } from './jsx-config';
import { radiantNitro } from './nitro-externals';

export {
	createRadiantDecoratorBabelPlugin,
	createRadiantDecoratorBabelPreset,
	type RadiantDecoratorBabelOptions,
	type RadiantDecoratorBabelVersion,
} from './decorators';
export { radiantElements, type RadiantElementsPluginOptions, type RadiantAppLoadMode } from './elements';
export { createRadiantJsxConfig, createRadiantSsrExternalsPlugin } from './jsx-config';
export { defineRadiantNitroConfig, mergeRadiantNitroConfig } from './nitro-config';
export { radiantNitro, radiantNitroExternals } from './nitro-externals';

export type RadiantDecoratorOption = 'babel';

export type RadiantPluginOptions = {
	jsxImportSource?: string;
	/**
	 * Decorator lowering strategy for Vite 8+.
	 *
	 * - `undefined` (default): rely on Vite/Oxc + your tsconfig. Prefer
	 *   `experimentalDecorators: true` — Oxc already lowers legacy TS decorators.
	 * - `'babel'`: temporary TC39 stage-3 lowering via `@rolldown/plugin-babel`
	 *   until Oxc supports ECMA decorators ([oxc#9170](https://github.com/oxc-project/oxc/issues/9170)).
	 */
	decorators?: RadiantDecoratorOption;
	/**
	 * Enable component discovery and virtual SSR/client registries.
	 *
	 * - omitted or false: JSX + SSR externals only
	 * - true: default element scan under src/components
	 * - object: pass through to {@link radiantElements}
	 *
	 * Defaults to true when nitro is enabled.
	 */
	elements?: boolean | RadiantElementsPluginOptions;
	/**
	 * Keep @ecopages/* external in Nitro nitro/ssr Vite environments.
	 * Register the returned plugins after nitro() from nitro/vite.
	 *
	 * Implies elements unless elements is explicitly false.
	 */
	nitro?: boolean;
};

function resolveElementsOptions(options: RadiantPluginOptions): RadiantElementsPluginOptions | false {
	if (options.elements === false) {
		return false;
	}

	if (options.elements === true) {
		return {};
	}

	if (typeof options.elements === 'object') {
		return options.elements;
	}

	if (options.nitro) {
		return {};
	}

	return false;
}

function createRadiantBasePlugins(options: RadiantPluginOptions): Plugin[] {
	return [createRadiantJsxConfig({ jsxImportSource: options.jsxImportSource }), createRadiantSsrExternalsPlugin()];
}

function createRadiantPlugins(options: RadiantPluginOptions): Plugin[] {
	const plugins = createRadiantBasePlugins(options);
	const elementsOptions = resolveElementsOptions(options);

	if (elementsOptions !== false) {
		plugins.push(radiantElements(elementsOptions));
	}

	if (options.nitro) {
		plugins.push(radiantNitro());
	}

	return plugins;
}

export function radiant(options?: Omit<RadiantPluginOptions, 'decorators'>): Plugin[];
export function radiant(options: RadiantPluginOptions & { decorators: 'babel' }): Promise<Plugin[]>;
export function radiant(options: RadiantPluginOptions = {}): Plugin[] | Promise<Plugin[]> {
	if (options.decorators === 'babel') {
		return createRadiantDecoratorBabelPlugin().then((babelPlugin) => [
			...createRadiantPlugins(options),
			babelPlugin,
		]);
	}

	return createRadiantPlugins(options);
}

/**
 * Full-stack Radiant SSR preset: JSX, SSR externals, element discovery, and Nitro externals.
 * Register after `nitro()` from `nitro/vite`. Pair with `defineRadiantNitroConfig()` in `nitro.config.ts`.
 */
export function radiantSsr(options?: Omit<RadiantPluginOptions, 'nitro' | 'decorators'>): Plugin[];
export function radiantSsr(options: Omit<RadiantPluginOptions, 'nitro'> & { decorators: 'babel' }): Promise<Plugin[]>;
export function radiantSsr(options: Omit<RadiantPluginOptions, 'nitro'> = {}): Plugin[] | Promise<Plugin[]> {
	const radiantOptions: RadiantPluginOptions = {
		...options,
		elements: options.elements ?? true,
		nitro: true,
	};

	if (radiantOptions.decorators === 'babel') {
		return createRadiantDecoratorBabelPlugin().then((babelPlugin) => [
			...createRadiantPlugins(radiantOptions),
			babelPlugin,
		]);
	}

	return createRadiantPlugins(radiantOptions);
}

export default radiant;
