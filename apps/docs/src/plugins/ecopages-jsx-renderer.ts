import type {
	EcoComponent,
	EcoComponentConfig,
	EcoPageFile,
	GetMetadata,
	HtmlTemplateProps,
	IntegrationRendererRenderOptions,
	PageMetadataProps,
	RouteRendererBody,
} from '@ecopages/core';
import type { EcoPagesAppConfig } from '@ecopages/core/internal-types.ts';
import {
	IntegrationRenderer,
	type RenderToResponseContext,
} from '@ecopages/core/route-renderer/integration-renderer.ts';
import type { AssetProcessingService, ProcessedAsset } from '@ecopages/core/services/asset-processing-service.ts';
import { rapidhash } from '@ecopages/core/hash.ts';
import { renderToString, type JsxRenderable } from '@ecopages/jsx';
import { ECOPAGES_JSX_PLUGIN_NAME } from './ecopages-jsx.plugin';

type DocsHtmlTemplateProps = Omit<HtmlTemplateProps, 'children' | 'headContent'> & {
	children: JsxRenderable;
	headContent?: JsxRenderable;
};

type AsyncEcoComponent<P = Record<string, unknown>, R = JsxRenderable> = EcoComponent<P, R | Promise<R>>;
type MdxPageModule = EcoPageFile<{
	config?: EcoComponentConfig;
	layout?: EcoComponent;
	getMetadata?: GetMetadata;
}>;

const renderComponent = async <P>(component: AsyncEcoComponent<P>, props: P): Promise<JsxRenderable> => {
	return (await (component as (props: P) => JsxRenderable | Promise<JsxRenderable>)(props)) as JsxRenderable;
};

const createEcoMeta = (file: string): NonNullable<EcoComponentConfig['__eco']> => ({
	id: String(rapidhash(file)),
	file,
	integration: ECOPAGES_JSX_PLUGIN_NAME,
});

/**
 * Local Ecopages renderer for JSX templates in the docs app.
 *
 * This keeps the integration scoped to the docs package while supporting
 * async page, layout, and html template components on the server.
 */
export class EcopagesJsxRenderer extends IntegrationRenderer<JsxRenderable> {
	name = ECOPAGES_JSX_PLUGIN_NAME;
	static mdxExtensions = ['.mdx'];

	constructor({
		appConfig,
		assetProcessingService,
		resolvedIntegrationDependencies,
		runtimeOrigin,
	}: {
		appConfig: EcoPagesAppConfig;
		assetProcessingService: AssetProcessingService;
		resolvedIntegrationDependencies: ProcessedAsset[];
		runtimeOrigin: string;
	}) {
		super({
			appConfig,
			assetProcessingService,
			resolvedIntegrationDependencies,
			runtimeOrigin,
		});
	}

	public isMdxFile(filePath: string): boolean {
		return EcopagesJsxRenderer.mdxExtensions.some((ext) => filePath.endsWith(ext));
	}

	protected override async importPageFile(file: string): Promise<MdxPageModule> {
		const module = (await super.importPageFile(file)) as MdxPageModule;

		if (!this.isMdxFile(file)) {
			return module;
		}

		const Page = module.default as EcoComponent;
		const normalizedConfig: EcoComponentConfig = {
			...(module.config ?? Page.config ?? {}),
			...(module.layout ? { layout: module.layout } : {}),
			__eco: module.config?.__eco ?? Page.config?.__eco ?? createEcoMeta(file),
		};

		Page.config = normalizedConfig;

		if (module.getMetadata) {
			Page.metadata = module.getMetadata;
		}

		return {
			...module,
			default: Page,
			config: normalizedConfig,
		};
	}

	override async render(options: IntegrationRendererRenderOptions<JsxRenderable>): Promise<RouteRendererBody> {
		try {
			const page = await renderComponent(options.Page as AsyncEcoComponent<Record<string, unknown>>, {
				...options.pageProps,
				locals: options.pageLocals,
			});

			const content = options.Layout
				? await renderComponent(options.Layout as AsyncEcoComponent<Record<string, unknown>>, {
						...options.pageProps,
						children: page,
						locals: options.locals,
					})
				: page;

			const document = await renderComponent(options.HtmlTemplate as AsyncEcoComponent<DocsHtmlTemplateProps>, {
				metadata: options.metadata,
				pageProps: options.pageProps ?? {},
				children: content,
			});

			return `${this.DOC_TYPE}${renderToString(document)}`;
		} catch (error) {
			throw this.createRenderError('Error rendering page', error);
		}
	}

	override async renderToResponse<P = Record<string, unknown>>(
		view: EcoComponent<P>,
		props: P,
		ctx: RenderToResponseContext,
	): Promise<Response> {
		try {
			const layout = ctx.partial ? undefined : view.config?.layout;
			await this.prepareViewDependencies(view, layout);

			const HtmlTemplate = ctx.partial ? undefined : await this.getHtmlTemplate();
			const metadata = ctx.partial ? undefined : await this.resolveViewMetadata(view, props);
			const capturedRender = await this.captureHtmlRender(async () => {
				const viewContent = await renderComponent(view as AsyncEcoComponent<P>, props);

				if (ctx.partial) {
					return renderToString(viewContent);
				}

				return this.renderDocument(viewContent, {
					metadata: metadata as PageMetadataProps,
					pageProps: (props ?? {}) as Record<string, unknown>,
					layout,
				});
			});

			const html = await this.finalizeCapturedHtmlRender({
				html: capturedRender.html,
				graphContext: capturedRender.graphContext,
				componentsToResolve: HtmlTemplate
					? layout
						? [HtmlTemplate as EcoComponent, layout, view]
						: [HtmlTemplate as EcoComponent, view]
					: [view],
				partial: ctx.partial,
			});

			return this.createHtmlResponse(html, ctx);
		} catch (error) {
			throw this.createRenderError('Error rendering view', error);
		}
	}

	private async resolveViewMetadata<P>(view: EcoComponent<P>, props: P): Promise<PageMetadataProps> {
		return view.metadata
			? await view.metadata({
					params: {},
					query: {},
					props: props as Record<string, unknown>,
					appConfig: this.appConfig,
				})
			: this.appConfig.defaultMetadata;
	}

	private async renderDocument(
		content: JsxRenderable,
		{
			metadata,
			pageProps,
			layout,
		}: {
			metadata: PageMetadataProps;
			pageProps: Record<string, unknown>;
			layout?: EcoComponent;
		},
	): Promise<string> {
		const resolvedContent = layout
			? await renderComponent(layout as AsyncEcoComponent<Record<string, unknown>>, {
					...pageProps,
					children: content,
				})
			: content;

		const HtmlTemplate = await this.getHtmlTemplate();
		const document = await renderComponent(HtmlTemplate as AsyncEcoComponent<DocsHtmlTemplateProps>, {
			metadata,
			pageProps,
			children: resolvedContent,
		});

		return `${this.DOC_TYPE}${renderToString(document)}`;
	}
}
