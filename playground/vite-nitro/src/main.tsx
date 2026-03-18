import { createRoot } from '@ecopages/jsx';
import './components/radiant-component-counter.script';
import './components/radiant-component-server-card.script';
import { createInitialPlaygroundState, decodePlaygroundState, renderPlaygroundView } from './playground-view';
import './style.css';

const mountNode = document.querySelector<HTMLElement>('#app');

if (!mountNode) {
	throw new Error('Missing #app mount node.');
}

const root = createRoot(mountNode);
const initialState = readInitialState(mountNode);
const state = initialState ?? createInitialPlaygroundState();
let shouldHydrate = mountNode.childNodes.length > 0;

function renderApp() {
	const view = renderPlaygroundView(
		state,
		{
			incrementClicks,
			loadServerMessage,
			loadSsrMarkup,
		},
		{
			ssrPreviewContent: createClientPreviewContent(state),
		},
	);

	if (shouldHydrate) {
		root.hydrate(view);
		shouldHydrate = false;
		return;
	}

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

async function loadSsrMarkup() {
	if (state.ssrStatus === 'loading') {
		return;
	}

	state.ssrStatus = 'loading';
	renderApp();

	try {
		const response = await fetch('/api/ssr/radiant-component');

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

if (!initialState) {
	void loadSsrMarkup();
}

function readInitialState(rootElement: HTMLElement) {
	const encodedState = rootElement.querySelector<HTMLElement>('[data-playground-state]')?.dataset.playgroundState;

	return decodePlaygroundState(encodedState);
}

function createClientPreviewContent(state: { ssrMarkup: string; ssrStatus: string }) {
	if (state.ssrStatus === 'error') {
		return state.ssrMarkup || 'Unknown error';
	}

	if (!state.ssrMarkup) {
		return <p>No SSR markup loaded yet.</p>;
	}

	const template = document.createElement('template');
	template.innerHTML = state.ssrMarkup;
	return Array.from(template.content.childNodes);
}

function extractTagNameFromMarkup(markup: string): string {
	const template = document.createElement('template');
	template.innerHTML = markup.trim();
	const firstElement = template.content.firstElementChild;

	return firstElement?.tagName.toLowerCase() ?? 'unknown';
}
