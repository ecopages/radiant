import { createRoot } from '@ecopages/jsx';
import './components/radiant-component-counter.script';
import './components/radiant-context-flow-shell.script';
import './components/radiant-component-server-card.script';
import './components/radiant-slot-studio-board.script.tsx';
import {
	PLAYGROUND_STATE_SCRIPT_ATTRIBUTE,
	createInitialPlaygroundState,
	createPlaygroundStateScriptNode,
	parsePlaygroundState,
	renderPlaygroundView,
} from './playground-view';
import './style.css';

const mountNode = document.querySelector<HTMLElement>('#app');

if (!mountNode) {
	throw new Error('Missing #app mount node.');
}

const root = createRoot(mountNode);
const initialBootstrap = readInitialState(mountNode);
const state = initialBootstrap?.state ?? createInitialPlaygroundState();
let shouldHydrate = mountNode.childNodes.length > 0;
let bootstrapStateScript = initialBootstrap?.serializedState
	? createPlaygroundStateScriptNode(initialBootstrap.serializedState)
	: undefined;

function renderApp() {
	const view = renderPlaygroundView(
		state,
		{
			incrementClicks,
			loadServerMessage,
			loadSsrMarkup,
		},
		{
			bootstrapStateScript,
			ssrPreviewContent: createClientPreviewContent(state),
		},
	);

	if (shouldHydrate) {
		root.hydrate(view);
		shouldHydrate = false;
		bootstrapStateScript = undefined;
		return;
	}

	bootstrapStateScript = undefined;
	root.render(view);
}

function incrementClicks() {
	state.clicks += 1;
	renderApp();
}

async function loadServerMessage() {
	state.status = 'loading';
	state.message = 'Calling Nitro...';
	renderApp();

	try {
		const response = await fetch('/api/hello');

		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}

		const payload = (await response.json()) as {
			message: string;
			runtime: string;
			generatedAt: string;
		};

		state.status = 'ready';
		state.message = `${payload.message} via ${payload.runtime}`;
		state.serverTime = payload.generatedAt;
	} catch (error) {
		state.status = 'error';
		state.message = error instanceof Error ? error.message : 'Unknown error';
		state.serverTime = 'n/a';
	}

	renderApp();
}

async function loadSsrMarkup(endpoint = '/api/ssr/radiant-component') {
	return loadSsrMarkupFrom(endpoint);
}

async function loadSsrMarkupFrom(endpoint = '/api/ssr/radiant-component') {
	if (state.ssrStatus === 'loading') {
		return;
	}

	state.ssrStatus = 'loading';
	renderApp();

	try {
		const response = await fetch(endpoint);

		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}

		const markup = await response.text();

		state.ssrStatus = 'ready';
		state.ssrGeneratedAt = response.headers.get('x-generated-at') ?? 'n/a';
		state.ssrMarkup = markup;
		state.ssrTagName = response.headers.get('x-radiant-tag-name') ?? extractTagNameFromMarkup(markup);
	} catch (error) {
		state.ssrStatus = 'error';
		state.ssrGeneratedAt = 'n/a';
		state.ssrMarkup = error instanceof Error ? error.message : 'Unknown error';
	}

	renderApp();
}

renderApp();

if (!initialBootstrap) {
	void loadSsrMarkupFrom();
}

function readInitialState(rootElement: HTMLElement) {
	const serializedState = rootElement.querySelector<HTMLScriptElement>(
		`script[${PLAYGROUND_STATE_SCRIPT_ATTRIBUTE}]`,
	)?.textContent;
	const state = parsePlaygroundState(serializedState);

	if (!state || !serializedState) {
		return undefined;
	}

	return {
		serializedState,
		state,
	};
}

function createClientPreviewContent(state: { ssrMarkup: string; ssrStatus: string }) {
	if (state.ssrStatus === 'error') {
		return state.ssrMarkup || 'Unknown error';
	}

	return createMarkupPreviewContent(state.ssrMarkup) ?? <p>No SSR markup loaded yet.</p>;
}

function createMarkupPreviewContent(markup: string) {
	if (!markup) {
		return undefined;
	}

	const template = document.createElement('template');
	template.innerHTML = markup;
	return Array.from(template.content.childNodes);
}

function extractTagNameFromMarkup(markup: string): string {
	const template = document.createElement('template');
	template.innerHTML = markup.trim();
	const firstElement = template.content.firstElementChild;

	return firstElement?.tagName.toLowerCase() ?? 'unknown';
}
