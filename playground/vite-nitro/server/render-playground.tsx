import './install-radiant-ssr';
import { renderToString } from '@ecopages/jsx';
import '../src/components/radiant-component-counter.script';
import '../src/components/radiant-context-flow-shell.script';
import '../src/components/radiant-component-server-card.script';
import type { RadiantComponentCounter } from '../src/components/radiant-component-counter.script';
import type { RadiantComponentServerCardElement } from '../src/components/radiant-component-server-card.script';
import { createInitialPlaygroundState, renderPlaygroundView, type PlaygroundCallbacks } from '../src/playground-view';
import {
	renderSsrRadiantComponent,
	toSsrComponentPayload,
	type SsrComponentPayload,
	type SsrComponentRender,
} from './radiant-ssr.ts';

const noopCallbacks: PlaygroundCallbacks = {
	incrementClicks: () => {},
	loadServerMessage: () => {},
	loadSsrMarkup: () => {},
};

export async function getSsrCounterPayload(): Promise<SsrComponentPayload> {
	return toSsrComponentPayload(await getSsrCounterRender());
}

export async function getSsrCounterRender(): Promise<SsrComponentRender> {
	return renderSsrRadiantComponent<RadiantComponentCounter>({
		load: async () => {
			const { RadiantComponentCounter: RadiantCounterComponent } =
				await import('../src/components/radiant-component-counter.script');
			return RadiantCounterComponent;
		},
		configure: (component) => {
			component.count = 6;
			component.label = 'SSR counter rendered in Nitro';
		},
		tagName: 'radiant-component-counter',
	});
}

export async function getSsrServerCardPayload(): Promise<SsrComponentPayload> {
	return toSsrComponentPayload(await getSsrServerCardRender());
}

export async function getSsrServerCardRender(): Promise<SsrComponentRender> {
	return renderSsrRadiantComponent<RadiantComponentServerCardElement>({
		load: async () => {
			const { RadiantComponentServerCardElement } =
				await import('../src/components/radiant-component-server-card.script');
			return RadiantComponentServerCardElement;
		},
		configure: () => {},
		tagName: 'radiant-component-server-card',
	});
}

export async function renderPlaygroundResponse(): Promise<Response> {
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
}
