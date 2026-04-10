import { renderToString } from '@ecopages/jsx';
import { toRenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { resolveRadiantAppLoadMode } from 'virtual:radiant/app-load-mode';
import { renderSsrComponent } from '../server/render';
import {
	App,
	createInitialPlaygroundState,
	createPlaygroundStateScriptNode,
	isPlaygroundPath,
	playgroundInitialComponent,
} from '../src/app';

export default {
	async fetch(request: Request) {
		const url = new URL(request.url);

		if (!isPlaygroundPath(url.pathname)) {
			return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
		}

		if (resolveRadiantAppLoadMode(request) === 'client-only') {
			return new Response('', { headers: { 'content-type': 'text/html; charset=utf-8' } });
		}

		const rendered = await renderSsrComponent(playgroundInitialComponent);
		const state = createInitialPlaygroundState(toRenderedComponentPayload(rendered));
		const view = App(state, {
			bootstrapStateScript: createPlaygroundStateScriptNode(state),
			ssrPreviewContent: rendered.preview,
		});
		const html = renderToString(view, { hydrate: true });

		return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
	},
};
