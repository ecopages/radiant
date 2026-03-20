import type { JsxElement } from '@ecopages/jsx';
import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';

/**
 * Serializable fragment metadata returned by Nitro SSR endpoints.
 */
export type SsrComponentPayload = {
	generatedAt: string;
	markup: string;
	tagName: string;
};

/**
 * Full SSR result for a Radiant component, including the JSX preview tree used
 * when composing the server-rendered playground page.
 */
export type SsrComponentRender = SsrComponentPayload & {
	preview: JsxElement;
};

/**
 * Minimal component contract required by the shared Nitro SSR helper.
 */
export type SsrRenderableComponent = {
	renderHost: () => JsxElement;
	renderHostToString: (options?: { hydrate?: boolean }) => string;
};

/**
 * Constructor shape used to lazily load SSR-capable Radiant components.
 */
export type SsrRenderableComponentConstructor<TComponent extends SsrRenderableComponent> = new () => TComponent;

/**
 * Configuration used by the shared Nitro helper to load, configure, and render
 * a specific Radiant component.
 */
export type RenderSsrComponentOptions<TComponent extends SsrRenderableComponent> = {
	configure: (component: TComponent) => void;
	load: () => Promise<SsrRenderableComponentConstructor<TComponent>>;
	tagName: string;
};

/**
 * Normalizes a full component render result into the canonical SSR shape used
 * by the Nitro playground helpers.
 */
export function createSsrComponentRender(render: SsrComponentRender): SsrComponentRender {
	return render;
}

/**
 * Removes the preview tree from a full SSR render so the result can be returned
 * from a fragment endpoint.
 */
export function toSsrComponentPayload(render: SsrComponentRender): SsrComponentPayload {
	const { preview: _preview, ...payload } = render;
	return payload;
}

/**
 * Creates the standard HTML fragment response used by Nitro SSR component
 * endpoints, including metadata headers consumed by the playground client.
 */
export function createSsrComponentResponse(payload: SsrComponentPayload): Response {
	return new Response(payload.markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'x-generated-at': payload.generatedAt,
			'x-radiant-tag-name': payload.tagName,
		},
	});
}

/**
 * Renders a Radiant component into both HTML and JSX preview content for use by
 * server-side fragment routes and server-side page composition.
 */
export async function renderSsrRadiantComponent<TComponent extends SsrRenderableComponent>(
	options: RenderSsrComponentOptions<TComponent>,
): Promise<SsrComponentRender> {
	installLightDomShim();
	const Component = await options.load();
	const component = new Component();

	options.configure(component);

	return createSsrComponentRender({
		generatedAt: new Date().toISOString(),
		markup: component.renderHostToString({ hydrate: true }),
		preview: component.renderHost(),
		tagName: options.tagName,
	});
}
