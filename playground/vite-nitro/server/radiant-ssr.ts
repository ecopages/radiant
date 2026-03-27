import { createRenderedComponentHeaders, type RenderedComponent } from '@ecopages/radiant/server/render-component';

/**
 * Creates the standard HTML fragment response used by Nitro SSR component
 * endpoints, including metadata headers consumed by the playground client.
 */
export function createSsrComponentResponse(rendered: RenderedComponent): Response {
	return new Response(rendered.markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...createRenderedComponentHeaders(rendered.metadata),
		},
	});
}
