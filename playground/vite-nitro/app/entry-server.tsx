import { renderToString } from '@ecopages/jsx/server';
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

		const rendered = await renderSsrComponent(RadiantComponentCounter, {
			props: {
				count: 6,
				label: 'SSR counter rendered in Nitro',
			},
		});
		const state = createInitialPlaygroundState(toRenderedComponentPayload(rendered));
		setPlaygroundState(state);

		const html = renderToString(
			<App bootstrapStateScript={createPlaygroundStateScriptNode(state)} ssrPreviewContent={rendered.preview} />,
			{ mode: 'hydrate' },
		);

		return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
	},
};
