import { renderToString } from '@ecopages/jsx';
import { createInitialPlaygroundState, renderPlaygroundView, type PlaygroundCallbacks } from '../src/playground-view';
import { getSsrCounterRender } from '/server/render-playground.tsx';

const noopCallbacks: PlaygroundCallbacks = {
	incrementClicks: () => {},
	loadServerMessage: () => {},
	loadSsrMarkup: () => {},
};

export default {
	async fetch() {
		const payload = await getSsrCounterRender();
		const state = createInitialPlaygroundState(payload);
		const app = renderPlaygroundView(state, noopCallbacks, {
			ssrPreviewContent: payload.preview,
		});

		return new Response(renderToString(app, { hydrate: true }), {
			headers: {
				'content-type': 'text/html; charset=utf-8',
			},
		});
	},
};
