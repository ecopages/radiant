import type {
	EcoComponent,
	EcoPagesElement,
	HtmlTemplateProps,
	IntegrationRendererRenderOptions,
	PageMetadataProps,
} from '@ecopages/core';
import { IntegrationRenderer, type RenderToResponseContext } from '@ecopages/core/route-renderer/integration-renderer';
import { renderToString, type JsxRenderable } from '@ecopages/jsx';

type AsyncEcoComponent<P = Record<string, unknown>, R = JsxRenderable> = EcoComponent<P, R | Promise<R>>;

const renderComponent = async <P>(component: AsyncEcoComponent<P>, props: P): Promise<JsxRenderable> => {
	return (await component(props)) as JsxRenderable;
};

/**
 * Local Ecopages renderer for JSX templates in the docs app.
 *
 * This keeps the integration scoped to the docs package while supporting
 * async page, layout, and html template components on the server.
 */
export class EcopagesJsxRenderer extends IntegrationRenderer<JsxRenderable> {
	name = 'ecopages-jsx';

	override async render(
		options: IntegrationRendererRenderOptions<JsxRenderable>,
	): Promise<EcoPagesElement> {
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

		const document = await renderComponent(options.HtmlTemplate as AsyncEcoComponent<HtmlTemplateProps>, {
			metadata: options.metadata,
			pageProps: options.props ?? {},
			children: content,
		});

		return `${this.DOC_TYPE}${renderToString(document)}`;
	}

	override async renderToResponse<P = Record<string, unknown>>(
		view: EcoComponent<P>,
		props: P,
		ctx: RenderToResponseContext,
	): Promise<Response> {
		const layout = ctx.partial ? undefined : view.config?.layout;
		await this.prepareViewDependencies(view, layout);

		const viewContent = await renderComponent(view as AsyncEcoComponent<P>, props);
		const html = ctx.partial
			? renderToString(viewContent)
			: await this.renderDocument(viewContent, {
				metadata: this.appConfig.defaultMetadata,
				pageProps: props as Record<string, unknown>,
				layout,
			});

		return this.htmlTransformer.transform(this.createHtmlResponse(html, ctx));
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
		const document = await renderComponent(HtmlTemplate as AsyncEcoComponent<HtmlTemplateProps>, {
			metadata,
			pageProps,
			children: resolvedContent,
		});

		return `${this.DOC_TYPE}${renderToString(document)}`;
	}
}