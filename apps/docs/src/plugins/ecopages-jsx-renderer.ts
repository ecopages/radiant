import type {
	ComponentRenderInput,
	ComponentRenderResult,
	EcoComponent,
	EcoFunctionComponent,
	EcoComponentConfig,
	EcoPageFile,
	GetMetadata,
	HtmlTemplateProps,
	IntegrationRendererRenderOptions,
	PageMetadataProps,
	RouteRendererBody,
} from '@ecopages/core';
import { rapidhash } from '@ecopages/core/hash';
import type { EcoPagesAppConfig } from '@ecopages/core/internal-types';
import { IntegrationRenderer, type RenderToResponseContext } from '@ecopages/core/route-renderer/integration-renderer';
import type { AssetProcessingService, ProcessedAsset } from '@ecopages/core/services/asset-processing-service';
import type { JsxRenderable } from '@ecopages/jsx';
import { renderToString, withServerCustomElementRenderHook } from '@ecopages/jsx/server';
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

const isEcoFunctionComponent = (component: EcoComponent): component is EcoFunctionComponent<any, any> => {
	return typeof component === 'function';
};

const renderComponent = async <P>(component: AsyncEcoComponent<P>, props: P): Promise<JsxRenderable> => {
	return (await (component as (props: P) => JsxRenderable | Promise<JsxRenderable>)(props)) as JsxRenderable;
};

const createEcoMeta = (file: string): NonNullable<EcoComponentConfig['__eco']> => ({
	id: String(rapidhash(file)),
	file,
	integration: ECOPAGES_JSX_PLUGIN_NAME,
});

const wrapMdxPage = (
	page: AsyncEcoComponent<Record<string, unknown>>,
	{
		config,
		metadata,
	}: {
		config: EcoComponentConfig;
		metadata?: GetMetadata;
	},
): AsyncEcoComponent<Record<string, unknown>> => {
	const wrappedPage = (async (props: Record<string, unknown>) => renderComponent(page, props)) as AsyncEcoComponent<
		Record<string, unknown>
	>;

	wrappedPage.config = config;

	if (metadata) {
		wrappedPage.metadata = metadata;
	}

	return wrappedPage;
};

/**
 * Local Ecopages renderer for JSX templates in the docs app.
 *
 * This keeps the integration scoped to the docs package while supporting
 * async page, layout, and html template components on the server.
 */
export class EcopagesJsxRenderer extends IntegrationRenderer<JsxRenderable> {
	name = ECOPAGES_JSX_PLUGIN_NAME;
	static mdxExtensions = ['.mdx'];
	private intrinsicCustomElementAssets = new Map<string, readonly ProcessedAsset[]>();
	private collectedAssetFrames: ProcessedAsset[][] = [];

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

	/** Returns whether the requested page file should be treated as MDX. */
	public isMdxFile(filePath: string): boolean {
		return EcopagesJsxRenderer.mdxExtensions.some((ext) => filePath.endsWith(ext));
	}

	/**
	 * Supplies the intrinsic custom-element assets discovered by the plugin so
	 * component renders can attach the correct client scripts.
	 */
	public setIntrinsicCustomElementAssets(assetsByTagName: Map<string, readonly ProcessedAsset[]>): void {
		this.intrinsicCustomElementAssets = assetsByTagName;
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
		const wrappedPage = wrapMdxPage(Page as AsyncEcoComponent<Record<string, unknown>>, {
			config: normalizedConfig,
			metadata: module.getMetadata ?? Page.metadata,
		});

		return {
			...module,
			default: wrappedPage,
			config: normalizedConfig,
		};
	}

	override async render(options: IntegrationRendererRenderOptions<JsxRenderable>): Promise<RouteRendererBody> {
		const assetFrame = this.beginCollectedAssetFrame();

		try {
			const page = await this.renderEcoComponent(options.Page as AsyncEcoComponent<Record<string, unknown>>, {
				...options.pageProps,
				locals: options.pageLocals,
			});

			const content = options.Layout
				? await this.renderEcoComponent(options.Layout as AsyncEcoComponent<Record<string, unknown>>, {
						...options.pageProps,
						children: page,
						locals: options.locals,
					})
				: page;

			const document = await this.renderEcoComponent(
				options.HtmlTemplate as AsyncEcoComponent<DocsHtmlTemplateProps>,
				{
					metadata: options.metadata,
					pageProps: options.pageProps ?? {},
					children: content,
				},
			);
			const renderedDocument = this.renderJsx(document);
			this.mergeCollectedAssets(this.endCollectedAssetFrame(assetFrame));

			return `${this.DOC_TYPE}${renderedDocument.html}`;
		} catch (error) {
			this.endCollectedAssetFrame(assetFrame);
			throw this.createRenderError('Error rendering page', error);
		}
	}

	override async renderComponent(input: ComponentRenderInput): Promise<ComponentRenderResult> {
		const assetFrame = this.beginCollectedAssetFrame();

		try {
			if (!isEcoFunctionComponent(input.component)) {
				throw new TypeError('JSX renderer expected a callable component.');
			}

			const response = await this.renderToResponse<any>(input.component, input.props, { partial: true });
			const html = await response.text();
			const assets = this.endCollectedAssetFrame(assetFrame);

			return {
				html,
				canAttachAttributes: true,
				rootTag: this.getRootTagName(html),
				integrationName: this.name,
				assets,
			};
		} catch (error) {
			this.endCollectedAssetFrame(assetFrame);
			throw this.createRenderError('Error rendering component', error);
		}
	}

	override async renderToResponse<P = any>(
		view: EcoComponent<P>,
		props: P,
		ctx: RenderToResponseContext,
	): Promise<Response> {
		try {
			if (!isEcoFunctionComponent(view)) {
				throw new TypeError('JSX renderer expected a callable view component.');
			}

			const layout = ctx.partial ? undefined : view.config?.layout;
			await this.prepareViewDependencies(view, layout);

			const HtmlTemplate = ctx.partial ? undefined : await this.getHtmlTemplate();
			const metadata = ctx.partial ? undefined : await this.resolveViewMetadata(view, props);
			const assetFrame = this.beginCollectedAssetFrame();
			const capturedRender = await this.captureHtmlRender(async () => {
				const viewContent = await this.renderEcoComponent(view as AsyncEcoComponent<P>, props);

				if (ctx.partial) {
					return this.renderJsx(viewContent).html;
				}

				return (
					await this.renderDocument(viewContent, {
						metadata: metadata as PageMetadataProps,
						pageProps: (props ?? {}) as Record<string, unknown>,
						layout,
					})
				).html;
			});
			this.mergeCollectedAssets(this.endCollectedAssetFrame(assetFrame));

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
	): Promise<{ assets: ProcessedAsset[]; html: string }> {
		const resolvedContent = layout
			? await this.renderEcoComponent(layout as AsyncEcoComponent<Record<string, unknown>>, {
					...pageProps,
					children: content,
				})
			: content;

		const HtmlTemplate = await this.getHtmlTemplate();
		const document = await this.renderEcoComponent(HtmlTemplate as AsyncEcoComponent<DocsHtmlTemplateProps>, {
			metadata,
			pageProps,
			children: resolvedContent,
		});
		const renderedDocument = this.renderJsx(document);

		return {
			assets: renderedDocument.assets,
			html: `${this.DOC_TYPE}${renderedDocument.html}`,
		};
	}

	private beginCollectedAssetFrame(): ProcessedAsset[] {
		const frame: ProcessedAsset[] = [];
		this.collectedAssetFrames.push(frame);
		return frame;
	}

	private endCollectedAssetFrame(frame: ProcessedAsset[]): ProcessedAsset[] {
		const activeFrame = this.collectedAssetFrames.pop();

		if (!activeFrame || activeFrame !== frame) {
			return this.htmlTransformer.dedupeProcessedAssets(frame);
		}

		return this.htmlTransformer.dedupeProcessedAssets(activeFrame);
	}

	private mergeCollectedAssets(assets: readonly ProcessedAsset[]): void {
		if (assets.length === 0) {
			return;
		}

		this.htmlTransformer.setProcessedDependencies(
			this.htmlTransformer.dedupeProcessedAssets([...this.htmlTransformer.getProcessedDependencies(), ...assets]),
		);
	}

	private renderJsx(value: JsxRenderable): { assets: ProcessedAsset[]; html: string } {
		const collectedAssets: ProcessedAsset[] = [];
		const html = withServerCustomElementRenderHook(
			this.createIntrinsicCustomElementRenderHook(collectedAssets),
			() => renderToString(value),
		);
		const dedupedAssets = this.htmlTransformer.dedupeProcessedAssets(collectedAssets);
		const activeFrame = this.collectedAssetFrames[this.collectedAssetFrames.length - 1];

		if (activeFrame) {
			activeFrame.push(...dedupedAssets);
		}

		return {
			assets: dedupedAssets,
			html,
		};
	}

	private async renderEcoComponent<P>(component: AsyncEcoComponent<P>, props: P): Promise<JsxRenderable> {
		const collectedAssets: ProcessedAsset[] = [];
		const rendered = await withServerCustomElementRenderHook(
			this.createIntrinsicCustomElementRenderHook(collectedAssets),
			() => renderComponent(component, props),
		);
		const activeFrame = this.collectedAssetFrames[this.collectedAssetFrames.length - 1];

		if (activeFrame) {
			activeFrame.push(...this.htmlTransformer.dedupeProcessedAssets(collectedAssets));
		}

		return rendered;
	}

	private createIntrinsicCustomElementRenderHook(target: ProcessedAsset[]) {
		return ({ tagName }: { tagName: string }) => {
			const assets = this.intrinsicCustomElementAssets.get(tagName);

			if (assets) {
				target.push(...assets);
			}

			return undefined;
		};
	}
}
