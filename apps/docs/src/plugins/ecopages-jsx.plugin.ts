import type { Options as MdxEsbuildOptions } from '@mdx-js/esbuild';
import type { EcoBuildLoader, EcoBuildPlugin } from '@ecopages/core/build/build-types.ts';
import { IntegrationPlugin, type IntegrationPluginConfig } from '@ecopages/core/plugins/integration-plugin.ts';
import type { JsxRenderable } from '@ecopages/jsx';
import * as esbuild from 'esbuild';
import type { PartialMessage, Plugin as EsbuildPlugin, PluginBuild as EsbuildPluginBuild } from 'esbuild';
import { EcopagesJsxRenderer } from './ecopages-jsx-renderer';

type DocsMdxPluginList = NonNullable<MdxEsbuildOptions['remarkPlugins']>;

type DocsMdxCompileOptions = Omit<
	MdxEsbuildOptions,
	'jsxImportSource' | 'jsxRuntime' | 'remarkPlugins' | 'rehypePlugins' | 'recmaPlugins'
> & {
	remarkPlugins?: DocsMdxPluginList;
	rehypePlugins?: DocsMdxPluginList;
	recmaPlugins?: DocsMdxPluginList;
};

type ResolvedDocsMdxCompileOptions = DocsMdxCompileOptions & Pick<MdxEsbuildOptions, 'jsxImportSource' | 'jsxRuntime'>;

const mergePluginLists = <T>(...lists: Array<readonly T[] | null | undefined>): T[] | undefined => {
	const merged = lists.flatMap((list) => (list ? [...list] : []));
	return merged.length > 0 ? merged : undefined;
};

const toEcoBuildLoader = (loader: esbuild.Loader | undefined): EcoBuildLoader | undefined => {
	if (loader === undefined || loader === 'default') {
		return undefined;
	}

	return loader;
};

const formatEsbuildMessages = (kind: 'error' | 'warning', messages: PartialMessage[]): string =>
	esbuild.formatMessagesSync(messages, { kind, color: false }).join('\n');

const reportEsbuildWarnings = (warnings: PartialMessage[] | undefined): void => {
	if (!warnings || warnings.length === 0) {
		return;
	}

	console.warn(formatEsbuildMessages('warning', warnings));
};

const throwForEsbuildErrors = (errors: PartialMessage[] | undefined): void => {
	if (!errors || errors.length === 0) {
		return;
	}

	throw new Error(formatEsbuildMessages('error', errors));
};

const createEcoBuildPluginFromEsbuild = (plugin: EsbuildPlugin): EcoBuildPlugin => ({
	name: plugin.name,
	setup(build) {
		const pluginBuild: EsbuildPluginBuild = {
			initialOptions: {},
			resolve: async () => {
				throw new Error('esbuild resolve() is not supported by the Ecopages build-plugin bridge');
			},
			onStart: () => {},
			onEnd: () => {},
			onDispose: () => {},
			onResolve(options, callback) {
				build.onResolve(options, async (args) => {
					const result = await callback({
						path: args.path,
						importer: args.importer ?? '',
						namespace: args.namespace ?? '',
						resolveDir: '',
						kind: 'import-statement',
						pluginData: undefined,
						with: {},
					});

					if (!result) {
						return undefined;
					}

					return {
						path: result.path,
						namespace: result.namespace,
						external: result.external,
					};
				});
			},
			onLoad(options, callback) {
				build.onLoad(options, async (args) => {
					const result = await callback({
						path: args.path,
						namespace: args.namespace ?? '',
						suffix: '',
						pluginData: undefined,
						with: {},
					});

					if (!result) {
						return undefined;
					}

					reportEsbuildWarnings(result.warnings);
					throwForEsbuildErrors(result.errors);

					return {
						contents: result.contents,
						loader: toEcoBuildLoader(result.loader),
						resolveDir: result.resolveDir,
					};
				});
			},
			esbuild,
		};

		return plugin.setup(pluginBuild);
	},
});

/** The integration name for the docs-local JSX renderer. */
export const ECOPAGES_JSX_PLUGIN_NAME = 'ecopages-jsx';

/**
 * MDX configuration for the docs-local JSX integration.
 *
 * This mirrors Ecopages' built-in combined integration pattern where a single
 * JSX-capable plugin can own both `.tsx` and `.mdx` route files.
 */
export type EcopagesJsxMdxOptions = {
	/** Enables MDX file handling inside the JSX integration. */
	enabled: boolean;
	/** Additional MDX compiler options. JSX runtime fields are managed by the integration. */
	compilerOptions?: DocsMdxCompileOptions;
	/** Extra remark plugins appended to `compilerOptions.remarkPlugins`. */
	remarkPlugins?: DocsMdxPluginList;
	/** Extra rehype plugins appended to `compilerOptions.rehypePlugins`. */
	rehypePlugins?: DocsMdxPluginList;
	/** Extra recma plugins appended to `compilerOptions.recmaPlugins`. */
	recmaPlugins?: DocsMdxPluginList;
	/** Custom file extensions to treat as MDX. */
	extensions?: string[];
};

/** Options for the docs-local JSX integration plugin. */
export type EcopagesJsxPluginOptions = Omit<IntegrationPluginConfig, 'name' | 'extensions'> & {
	/** Optional JSX route extensions. Defaults to `.tsx`. */
	extensions?: string[];
	/** Optional MDX integration configuration. */
	mdx?: EcopagesJsxMdxOptions;
};

/** Local docs-only JSX integration for `.tsx` templates. */
export class EcopagesJsxPlugin extends IntegrationPlugin<JsxRenderable> {
	renderer = EcopagesJsxRenderer as unknown as IntegrationPlugin<JsxRenderable>['renderer'];
	private mdxEnabled: boolean;
	private mdxCompilerOptions?: ResolvedDocsMdxCompileOptions;
	private mdxExtensions: string[];
	private mdxBunPlugin?: EsbuildPlugin;
	private mdxLoaderPlugin?: EcoBuildPlugin;

	override get plugins(): EcoBuildPlugin[] {
		return this.mdxLoaderPlugin ? [this.mdxLoaderPlugin] : [];
	}

	constructor(options?: EcopagesJsxPluginOptions) {
		const { extensions: _ignoredExtensions, ...restOptions } = options ?? {};
		const extensions = [...(options?.extensions ?? ['.tsx'])];
		const mdxExtensions = options?.mdx?.extensions ?? ['.mdx'];

		if (options?.mdx?.enabled) {
			for (const extension of mdxExtensions) {
				if (!extensions.includes(extension)) {
					extensions.push(extension);
				}
			}
		}

		super({
			name: ECOPAGES_JSX_PLUGIN_NAME,
			extensions,
			...restOptions,
		});

		this.mdxEnabled = options?.mdx?.enabled ?? false;
		this.mdxExtensions = mdxExtensions;
		EcopagesJsxRenderer.mdxExtensions = this.mdxExtensions;

		if (this.mdxEnabled) {
			const { compilerOptions, remarkPlugins, rehypePlugins, recmaPlugins } = options?.mdx ?? {};
			const resolvedCompilerOptions: ResolvedDocsMdxCompileOptions = {
				format: 'detect',
				outputFormat: 'program',
				...compilerOptions,
				jsxImportSource: '@ecopages/jsx',
				jsxRuntime: 'automatic',
				development: process.env.NODE_ENV === 'development',
			};

			const mergedRemarkPlugins = mergePluginLists(compilerOptions?.remarkPlugins, remarkPlugins);
			const mergedRehypePlugins = mergePluginLists(compilerOptions?.rehypePlugins, rehypePlugins);
			const mergedRecmaPlugins = mergePluginLists(compilerOptions?.recmaPlugins, recmaPlugins);

			if (mergedRemarkPlugins) {
				resolvedCompilerOptions.remarkPlugins = mergedRemarkPlugins;
			}

			if (mergedRehypePlugins) {
				resolvedCompilerOptions.rehypePlugins = mergedRehypePlugins;
			}

			if (mergedRecmaPlugins) {
				resolvedCompilerOptions.recmaPlugins = mergedRecmaPlugins;
			}

			this.mdxCompilerOptions = resolvedCompilerOptions;
		}
	}

	override async prepareBuildContributions(): Promise<void> {
		await this.ensureMdxLoaderPlugin();
	}

	override async setup(): Promise<void> {
		await this.ensureMdxLoaderPlugin();

		if (this.mdxEnabled && this.mdxCompilerOptions) {
			await this.setupMdxBunPlugin();
		}

		await super.setup();
	}

	override shouldDeferComponentBoundary(input: { currentIntegration: string; targetIntegration?: string }): boolean {
		return input.targetIntegration === this.name && input.currentIntegration !== this.name;
	}

	private async ensureMdxLoaderPlugin(): Promise<void> {
		if (!this.mdxEnabled || !this.mdxCompilerOptions || this.mdxLoaderPlugin) {
			return;
		}

		const mdx = (await import('@mdx-js/esbuild')).default;
		this.mdxBunPlugin = mdx(this.mdxCompilerOptions);
		this.mdxLoaderPlugin = createEcoBuildPluginFromEsbuild(this.mdxBunPlugin);
	}

	private async setupMdxBunPlugin(): Promise<void> {
		if (!this.mdxLoaderPlugin) {
			await this.ensureMdxLoaderPlugin();
		}

		if (!this.mdxLoaderPlugin) {
			return;
		}

		// @ts-expect-error Bun accepts esbuild-compatible plugins here.
		await Bun.plugin(this.mdxBunPlugin);
	}
}

/** Creates the docs-local JSX integration plugin. */
export const ecopagesJsxPlugin = (options?: EcopagesJsxPluginOptions) => new EcopagesJsxPlugin(options);
