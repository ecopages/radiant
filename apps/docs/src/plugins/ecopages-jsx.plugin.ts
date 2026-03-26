import type { CompileOptions } from '@mdx-js/mdx';
import type { EcoBuildPlugin } from '@ecopages/core/build/build-types';
import { IntegrationPlugin, type IntegrationPluginConfig } from '@ecopages/core/plugins/integration-plugin';
import type { JsxRenderable } from '@ecopages/jsx';
import { EcopagesJsxRenderer } from './ecopages-jsx-renderer';

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
	compilerOptions?: Omit<CompileOptions, 'jsxImportSource' | 'jsxRuntime'>;
	/** Extra remark plugins appended to `compilerOptions.remarkPlugins`. */
	remarkPlugins?: CompileOptions['remarkPlugins'];
	/** Extra rehype plugins appended to `compilerOptions.rehypePlugins`. */
	rehypePlugins?: CompileOptions['rehypePlugins'];
	/** Extra recma plugins appended to `compilerOptions.recmaPlugins`. */
	recmaPlugins?: CompileOptions['recmaPlugins'];
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
	renderer = EcopagesJsxRenderer;
	private mdxEnabled: boolean;
	private mdxCompilerOptions?: CompileOptions;
	private mdxExtensions: string[];
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
			this.mdxCompilerOptions = {
				format: 'detect',
				outputFormat: 'program',
				...compilerOptions,
				remarkPlugins: [...(compilerOptions?.remarkPlugins ?? []), ...(remarkPlugins ?? [])],
				rehypePlugins: [...(compilerOptions?.rehypePlugins ?? []), ...(rehypePlugins ?? [])],
				recmaPlugins: [...(compilerOptions?.recmaPlugins ?? []), ...(recmaPlugins ?? [])],
				jsxImportSource: '@ecopages/jsx',
				jsxRuntime: 'automatic',
				development: process.env.NODE_ENV === 'development',
			};
		}

		EcopagesJsxRenderer.mdxCompilerOptions = this.mdxCompilerOptions;
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
		this.mdxLoaderPlugin = mdx(this.mdxCompilerOptions) as EcoBuildPlugin;
	}

	private async setupMdxBunPlugin(): Promise<void> {
		if (!this.mdxLoaderPlugin) {
			await this.ensureMdxLoaderPlugin();
		}

		if (!this.mdxLoaderPlugin) {
			return;
		}

		// @ts-expect-error Bun accepts esbuild-compatible plugins here.
		await Bun.plugin(this.mdxLoaderPlugin);
	}
}

/** Creates the docs-local JSX integration plugin. */
export const ecopagesJsxPlugin = (options?: EcopagesJsxPluginOptions) => new EcopagesJsxPlugin(options);
