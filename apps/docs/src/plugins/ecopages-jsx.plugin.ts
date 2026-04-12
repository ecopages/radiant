import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Options as MdxEsbuildOptions } from '@mdx-js/esbuild';
import type { EcoBuildLoader, EcoBuildPlugin } from '@ecopages/core/build/build-types.ts';
import { IntegrationPlugin, type IntegrationPluginConfig } from '@ecopages/core/plugins/integration-plugin.ts';
import {
	AssetFactory,
	type AssetDefinition,
	type ProcessedAsset,
} from '@ecopages/core/services/asset-processing-service.ts';
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

const DOCS_JSX_VENDOR_FILE_NAMES = {
	jsx: 'ecopages-jsx-esm.js',
	radiant: 'ecopages-radiant-esm.js',
	signals: 'ecopages-signals-esm.js',
} as const;

const DOCS_JSX_RADIANT_ROOT_SPECIFIERS = [
	'@ecopages/radiant',
	'@ecopages/radiant/context',
	'@ecopages/radiant/context/context-provider',
	'@ecopages/radiant/context/consume-context',
	'@ecopages/radiant/context/context-selector',
	'@ecopages/radiant/context/create-context',
	'@ecopages/radiant/context/provide-context',
	'@ecopages/radiant/core/radiant-component',
	'@ecopages/radiant/core/radiant-element',
	'@ecopages/radiant/decorators/bound',
	'@ecopages/radiant/decorators/custom-element',
	'@ecopages/radiant/decorators/debounce',
	'@ecopages/radiant/decorators/event',
	'@ecopages/radiant/decorators/on-event',
	'@ecopages/radiant/decorators/on-updated',
	'@ecopages/radiant/decorators/prop',
	'@ecopages/radiant/decorators/query',
	'@ecopages/radiant/decorators/query-slot',
	'@ecopages/radiant/decorators/signal',
	'@ecopages/radiant/decorators/state',
] as const;

const DOCS_JSX_RUNTIME_SPECIFIER_TARGETS = [
	['@ecopages/jsx', DOCS_JSX_VENDOR_FILE_NAMES.jsx],
	['@ecopages/jsx/client', DOCS_JSX_VENDOR_FILE_NAMES.jsx],
	['@ecopages/jsx/jsx-runtime', DOCS_JSX_VENDOR_FILE_NAMES.jsx],
	['@ecopages/jsx/jsx-dev-runtime', DOCS_JSX_VENDOR_FILE_NAMES.jsx],
	['@ecopages/signals', DOCS_JSX_VENDOR_FILE_NAMES.signals],
	...DOCS_JSX_RADIANT_ROOT_SPECIFIERS.map((specifier) => [specifier, DOCS_JSX_VENDOR_FILE_NAMES.radiant] as const),
] as const;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRuntimeSpecifierSourceUrl = (fileName: string): string =>
	`/${AssetFactory.RESOLVED_ASSETS_VENDORS_DIR}/${fileName}`;

const createRuntimeSpecifierMap = (): Record<string, string> => {
	const specifierMap: Record<string, string> = {};

	for (const [specifier, fileName] of DOCS_JSX_RUNTIME_SPECIFIER_TARGETS) {
		specifierMap[specifier] = buildRuntimeSpecifierSourceUrl(fileName);
	}

	return specifierMap;
};

const createRuntimeExternalPlugin = (specifierMap: Record<string, string>): EcoBuildPlugin | undefined => {
	const specifiers = Object.keys(specifierMap);

	if (specifiers.length === 0) {
		return undefined;
	}

	const filter = new RegExp(`^(${specifiers.map(escapeRegExp).join('|')})$`);

	return {
		name: 'ecopages-jsx-runtime-externals',
		setup(build) {
			build.onResolve({ filter }, (args) => ({
				path: args.path,
				external: true,
			}));
		},
	};
};

const createRuntimeDependencies = (): AssetDefinition[] => {
	const specifierMap = createRuntimeSpecifierMap();

	return [
		AssetFactory.createInlineContentScript({
			position: 'head',
			bundle: false,
			content: JSON.stringify(
				{
					imports: specifierMap,
				},
				null,
				2,
			),
			attributes: {
				type: 'importmap',
			},
		}),
		AssetFactory.createNodeModuleScript({
			position: 'head',
			importPath: '@ecopages/jsx',
			name: 'ecopages-jsx-esm',
			excludeFromHtml: true,
			bundleOptions: {
				naming: DOCS_JSX_VENDOR_FILE_NAMES.jsx,
			},
			attributes: {
				type: 'module',
				defer: '',
			},
		}),
		AssetFactory.createNodeModuleScript({
			position: 'head',
			importPath: '@ecopages/signals',
			name: 'ecopages-signals-esm',
			excludeFromHtml: true,
			bundleOptions: {
				naming: DOCS_JSX_VENDOR_FILE_NAMES.signals,
			},
			attributes: {
				type: 'module',
				defer: '',
			},
		}),
		AssetFactory.createNodeModuleScript({
			position: 'head',
			importPath: '@ecopages/radiant',
			name: 'ecopages-radiant-esm',
			excludeFromHtml: true,
			bundleOptions: {
				naming: DOCS_JSX_VENDOR_FILE_NAMES.radiant,
			},
			attributes: {
				type: 'module',
				defer: '',
			},
		}),
	];
};

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

/**
 * Stable integration name shared by the docs-local JSX plugin and renderer.
 *
 * Ecopages uses this identifier to match route files, renderer instances, and
 * cross-integration component boundaries.
 */
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
	/** Renderer implementation used for JSX and MDX docs routes. */
	renderer = EcopagesJsxRenderer as unknown as IntegrationPlugin<JsxRenderable>['renderer'];
	private intrinsicCustomElementAssets = new Map<string, readonly ProcessedAsset[]>();
	private mdxEnabled: boolean;
	private mdxCompilerOptions?: ResolvedDocsMdxCompileOptions;
	private mdxExtensions: string[];
	private mdxBunPlugin?: EsbuildPlugin;
	private mdxLoaderPlugin?: EcoBuildPlugin;
	private runtimeExternalPlugin?: EcoBuildPlugin;
	private runtimeSpecifierMap: Record<string, string>;

	/** Returns the build plugins required by the docs JSX integration. */
	override get plugins(): EcoBuildPlugin[] {
		return [this.runtimeExternalPlugin, this.mdxLoaderPlugin].filter(
			(plugin): plugin is EcoBuildPlugin => plugin !== undefined,
		);
	}

	/**
	 * Exposes the bare-module specifier map used by the docs import map.
	 *
	 * Client bundles keep these imports external so the docs app can load the
	 * shared runtime packages from the generated vendor assets.
	 */
	override getRuntimeSpecifierMap(): Record<string, string> {
		return this.runtimeSpecifierMap;
	}

	/**
	 * Creates the renderer instance and attaches the discovered intrinsic custom
	 * element assets before the renderer handles any requests.
	 */
	override initializeRenderer() {
		const renderer = super.initializeRenderer() as EcopagesJsxRenderer;
		renderer.setIntrinsicCustomElementAssets(this.intrinsicCustomElementAssets);
		return renderer;
	}

	/**
	 * Creates a docs-local JSX integration.
	 *
	 * When MDX is enabled, the plugin also claims the configured MDX extensions
	 * and prepares compiler options around the shared `@ecopages/jsx` runtime.
	 */
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

		this.runtimeSpecifierMap = createRuntimeSpecifierMap();
		this.runtimeExternalPlugin = createRuntimeExternalPlugin(this.runtimeSpecifierMap);
		this.integrationDependencies.unshift(...createRuntimeDependencies());
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

	/** Ensures MDX build hooks are ready before Ecopages collects contributions. */
	override async prepareBuildContributions(): Promise<void> {
		await this.ensureMdxLoaderPlugin();
	}

	/**
	 * Registers MDX tooling, discovers intrinsic custom-element assets, and then
	 * completes the base integration setup.
	 */
	override async setup(): Promise<void> {
		await this.ensureMdxLoaderPlugin();

		if (this.mdxEnabled && this.mdxCompilerOptions) {
			await this.setupMdxBunPlugin();
		}

		await this.buildIntrinsicCustomElementAssetRegistry();

		await super.setup();
	}

	/**
	 * Defers boundaries only when another integration renders a component that is
	 * owned by this JSX integration.
	 */
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

	private async buildIntrinsicCustomElementAssetRegistry(): Promise<void> {
		if (!this.appConfig || !this.assetProcessingService) {
			return;
		}

		this.intrinsicCustomElementAssets = new Map();
		const scriptFiles = await this.collectScriptEntryFiles(this.appConfig.absolutePaths.srcDir);

		for (const scriptFile of scriptFiles) {
			const processedAsset = await this.resolveIntrinsicCustomElementAsset(scriptFile);

			if (!processedAsset) {
				continue;
			}

			for (const tagName of await this.extractIntrinsicCustomElementTagNames(scriptFile)) {
				this.intrinsicCustomElementAssets.set(tagName, [processedAsset]);
			}
		}
	}

	private async collectScriptEntryFiles(directory: string): Promise<string[]> {
		const directoryEntries = await readdir(directory, { withFileTypes: true });
		const scriptFiles: string[] = [];

		for (const directoryEntry of directoryEntries) {
			const entryPath = path.join(directory, directoryEntry.name);

			if (directoryEntry.isDirectory()) {
				scriptFiles.push(...(await this.collectScriptEntryFiles(entryPath)));
				continue;
			}

			if (/\.script\.(?:ts|tsx)$/.test(directoryEntry.name)) {
				scriptFiles.push(entryPath);
			}
		}

		return scriptFiles;
	}

	private async resolveIntrinsicCustomElementAsset(scriptFile: string): Promise<ProcessedAsset | undefined> {
		if (!this.assetProcessingService) {
			return undefined;
		}

		const [processedAsset] = await this.assetProcessingService.processDependencies(
			[
				AssetFactory.createFileScript({
					filepath: scriptFile,
					position: 'head',
				}),
			],
			`${this.name}:intrinsic-custom-elements:${scriptFile}`,
		);

		return processedAsset;
	}

	private async extractIntrinsicCustomElementTagNames(scriptFile: string): Promise<string[]> {
		const source = await readFile(scriptFile, 'utf8');
		const tagNames = new Set<string>();

		for (const match of source.matchAll(/@customElement\(\s*['"]([^'"]+)['"]/g)) {
			const tagName = match[1];

			if (tagName) {
				tagNames.add(tagName);
			}
		}

		return [...tagNames];
	}
}

/**
 * Creates the docs-local JSX integration plugin.
 *
 * This is the preferred entry point for configuring docs-local `.tsx` and
 * optional `.mdx` route handling.
 */
export const ecopagesJsxPlugin = (options?: EcopagesJsxPluginOptions) => new EcopagesJsxPlugin(options);
