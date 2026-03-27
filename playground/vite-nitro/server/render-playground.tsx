import { radiantSsrWindow } from './install-radiant-ssr';
import { renderToString } from '@ecopages/jsx';
import {
	renderComponent,
	toRenderedComponentPayload,
	type RenderedComponent,
} from '@ecopages/radiant/server/render-component';
import '../src/components/radiant-component-counter.script';
import '../src/components/radiant-context-flow-shell.script';
import '../src/components/radiant-signal-release-board.script';
import '../src/components/radiant-slot-studio-board.script.tsx';
import { RadiantComponentCounter } from '../src/components/radiant-component-counter.script';
import {
	createInitialPlaygroundState,
	createPlaygroundStateScriptNode,
	renderPlaygroundView,
	serializePlaygroundState,
	type PlaygroundCallbacks,
} from '../src/playground-view';
import { resolvePlaygroundSsrClientModuleSrc } from './ssr-component-module-resolver';

void radiantSsrWindow;

const noopCallbacks: PlaygroundCallbacks = {
	incrementClicks: () => {},
	loadServerMessage: () => {},
	loadSsrMarkup: () => {},
};

export async function getSsrCounterRender(): Promise<RenderedComponent> {
	return renderComponent(RadiantComponentCounter, {
		configure: (component) => {
			component.count = 6;
			component.label = 'SSR counter rendered in Nitro';
		},
		resolveClientModuleSrc: resolvePlaygroundSsrClientModuleSrc,
	});
}

export async function getSsrServerCardRender(): Promise<RenderedComponent> {
	const { RadiantComponentServerCardElement } = await import('../src/components/radiant-component-server-card.script');

	return renderComponent(RadiantComponentServerCardElement, {
		configure: () => {},
		resolveClientModuleSrc: resolvePlaygroundSsrClientModuleSrc,
	});
}

export async function getSsrSignalReleaseBoardRender(): Promise<RenderedComponent> {
	const { RadiantSignalReleaseBoardElement } = await import('../src/components/radiant-signal-release-board.script');

	return renderComponent(RadiantSignalReleaseBoardElement, {
		configure: (component) => {
			component.configureBoardState({
				filter: 'launch-ready',
				lastSyncAt: 'SSR rehearsal snapshot',
				selectedTicketId: 103,
				syncState: 'ready',
				syncSummary: 'Nitro preloaded the release rehearsal with a launch-ready focus.',
			});
		},
		resolveClientModuleSrc: resolvePlaygroundSsrClientModuleSrc,
	});
}

export async function renderPlaygroundResponse(): Promise<Response> {
	const renderedCounter = await getSsrCounterRender();
	const state = createInitialPlaygroundState(toRenderedComponentPayload(renderedCounter));
	const app = renderPlaygroundView(state, noopCallbacks, {
		bootstrapStateScript: createPlaygroundStateScriptNode(serializePlaygroundState(state)),
		ssrPreviewContent: renderedCounter.preview,
	});

	return new Response(renderToString(app, { hydrate: true }), {
		headers: {
			'content-type': 'text/html; charset=utf-8',
		},
	});
}
