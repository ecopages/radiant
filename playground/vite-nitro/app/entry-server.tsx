import { renderToString } from '@ecopages/jsx';
import { toRenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { resolveRadiantAppLoadMode } from 'virtual:radiant/app-load-mode';
import { renderSsrComponent } from '../server/render';
import { RadiantComponentCounter } from '../src/components/radiant-component-counter.script';
import { App, createInitialPlaygroundState, createPlaygroundStateScriptNode, setPlaygroundState } from '../src/app';

export default {
	async fetch(request: Request) {
		if (resolveRadiantAppLoadMode(request) === 'client-only') {
			return new Response('', { headers: { 'content-type': 'text/html; charset=utf-8' } });
		}

		const rendered = await renderSsrComponent({
			component: RadiantComponentCounter,
			configure: (component) => {
				component.count = 6;
				component.label = 'SSR counter rendered in Nitro';
			},
		});
		const state = createInitialPlaygroundState(toRenderedComponentPayload(rendered));
		setPlaygroundState(state);

		const html = renderToString(
			<App bootstrapStateScript={createPlaygroundStateScriptNode(state)} ssrPreviewContent={rendered.preview} />,
			{ hydrate: true },
		);

		return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
	},
};
