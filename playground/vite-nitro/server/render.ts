import '@ecopages/radiant/server/install-light-dom-shim';
import {
	renderComponent,
	createRenderedComponentHeaders,
	type RenderComponentOptions,
	type RenderedComponent,
	type ServerRenderableComponent,
} from '@ecopages/radiant/server/render-component';
import { resolveRadiantSsrClientModuleKey } from 'virtual:radiant/ssr-client-module-registry';
import '../src/components/radiant-component-counter.script';
import '../src/components/radiant-event-binding-lab.script';
import '../src/components/radiant-context-flow-shell.script';
import '../src/components/radiant-signal-release-board.script';
import '../src/components/radiant-slot-studio-board.script.tsx';

export async function renderSsrComponent<T extends ServerRenderableComponent>(
	options: RenderComponentOptions<T>,
): Promise<RenderedComponent> {
	return renderComponent({ resolveClientModuleSrc: resolveRadiantSsrClientModuleKey, ...options });
}

export function createSsrResponse(rendered: RenderedComponent): Response {
	return new Response(rendered.markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...createRenderedComponentHeaders(rendered.metadata),
		},
	});
}
