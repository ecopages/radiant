import type { JsxRenderable } from '@ecopages/jsx';
import { createRoot } from '@ecopages/jsx';
import { computed, createStore } from '@ecopages/signals';
import type { RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import {
	RENDERED_COMPONENT_CLIENT_MODULE_HEADER,
	RENDERED_COMPONENT_GENERATED_AT_HEADER,
	RENDERED_COMPONENT_TAG_NAME_HEADER,
} from '@ecopages/radiant/server/render-component';
import { loadRadiantClientModule } from 'virtual:radiant/client-module-registry';
import { createSsrStateScriptNode, readSsrStateFromDom, serializeSsrState } from '../vite-plugin-radiant/ssr-state';

export const PLAYGROUND_STATE_ATTRIBUTE = 'data-playground-state';
export const playgroundPathnames = ['/', '/playground'] as const;
export const playgroundInitialComponent = 'counter' as const;

export function isPlaygroundPath(pathname: string): boolean {
	return playgroundPathnames.includes(pathname as (typeof playgroundPathnames)[number]);
}

export type PlaygroundState = {
	clicks: number;
	ssrGeneratedAt: string;
	ssrMarkup: string;
	ssrStatus: 'idle' | 'loading' | 'ready' | 'error';
	ssrTagName: string;
	status: 'idle' | 'loading' | 'ready' | 'error';
	message: string;
	serverTime: string;
};

export type PlaygroundViewOptions = {
	ssrPreviewContent?: JsxRenderable;
	bootstrapStateScript?: JsxRenderable;
	clicksContent?: JsxRenderable;
	nitroButtonDisabled?: unknown;
	nitroButtonLabelContent?: JsxRenderable;
	nitroMessageContent?: JsxRenderable;
	nitroServerTimeContent?: JsxRenderable;
	nitroStatusAttribute?: unknown;
	nitroStatusContent?: JsxRenderable;
	requestRender?: () => void;
};

export function createInitialPlaygroundState(initialSsrPayload?: RenderedComponentPayload): PlaygroundState {
	return {
		clicks: 0,
		ssrGeneratedAt: initialSsrPayload?.generatedAt ?? 'n/a',
		ssrMarkup: initialSsrPayload?.markup ?? '',
		ssrStatus: initialSsrPayload ? 'ready' : 'idle',
		ssrTagName: initialSsrPayload?.tagName ?? 'radiant-component-counter',
		status: 'idle',
		message: 'Nitro endpoint has not been called yet.',
		serverTime: 'n/a',
	};
}

export function createPlaygroundStateScriptNode(state: PlaygroundState): JsxRenderable {
	return createSsrStateScriptNode(serializeSsrState(state), PLAYGROUND_STATE_ATTRIBUTE);
}

export function readPlaygroundStateFromDom(root: ParentNode = document) {
	return readSsrStateFromDom<PlaygroundState>(PLAYGROUND_STATE_ATTRIBUTE, root);
}

export function mount(element: HTMLElement) {
	const root = createRoot(element);
	const bootstrap = readPlaygroundStateFromDom(element);
	const state = createStore(bootstrap?.state ?? createInitialPlaygroundState());

	const clicksSignal = computed(() => state.clicks);
	const nitroStatusSignal = computed(() => state.status);
	const nitroMessageSignal = computed(() => state.message);
	const nitroServerTimeSignal = computed(() => state.serverTime);
	const nitroLoadingSignal = computed(() => state.status === 'loading');
	const nitroButtonLabelSignal = computed(() => (state.status === 'loading' ? 'Loading...' : 'Fetch /api/hello'));

	async function loadInitialSsrMarkup(endpoint = '/api/ssr/radiant-component') {
		if (state.ssrStatus === 'loading') {
			return;
		}

		state.ssrStatus = 'loading';
		render();

		try {
			const response = await fetch(endpoint);

			if (!response.ok) {
				throw new Error(`Request failed with ${response.status}`);
			}

			const markup = await response.text();
			const tagName =
				response.headers.get(RENDERED_COMPONENT_TAG_NAME_HEADER) ?? extractTagNameFromMarkup(markup);
			await ensureFragmentClientModule(tagName, response.headers.get(RENDERED_COMPONENT_CLIENT_MODULE_HEADER));

			state.ssrStatus = 'ready';
			state.ssrGeneratedAt = response.headers.get(RENDERED_COMPONENT_GENERATED_AT_HEADER) ?? 'n/a';
			state.ssrMarkup = markup;
			state.ssrTagName = tagName;
		} catch (error) {
			state.ssrStatus = 'error';
			state.ssrGeneratedAt = 'n/a';
			state.ssrMarkup = error instanceof Error ? error.message : 'Unknown error';
		}

		render();
	}

	let shouldHydrate = element.childNodes.length > 0;
	let bootstrapStateScript = bootstrap ? createPlaygroundStateScriptNode(bootstrap.state) : undefined;

	function render() {
		const view = App(state, {
			requestRender: render,
			bootstrapStateScript,
			clicksContent: clicksSignal,
			nitroButtonDisabled: nitroLoadingSignal,
			nitroButtonLabelContent: nitroButtonLabelSignal,
			nitroMessageContent: nitroMessageSignal,
			nitroServerTimeContent: nitroServerTimeSignal,
			nitroStatusAttribute: nitroStatusSignal,
			nitroStatusContent: nitroStatusSignal,
			ssrPreviewContent: createClientPreviewContent(state),
		});

		if (shouldHydrate) {
			root.hydrate(view);
			shouldHydrate = false;
			bootstrapStateScript = undefined;
			return;
		}

		bootstrapStateScript = undefined;
		root.render(view);
	}

	render();

	if (!bootstrap) {
		void loadInitialSsrMarkup();
	}
}

export function App(state: PlaygroundState, options: PlaygroundViewOptions = {}) {
	function incrementClicks() {
		state.clicks += 1;
	}

	async function loadServerMessage() {
		if (state.status === 'loading') {
			return;
		}

		state.status = 'loading';
		state.message = 'Calling Nitro...';

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
	}

	async function loadSsrMarkup(endpoint = '/api/ssr/radiant-component') {
		if (state.ssrStatus === 'loading') {
			return;
		}

		state.ssrStatus = 'loading';
		options.requestRender?.();

		try {
			const response = await fetch(endpoint);

			if (!response.ok) {
				throw new Error(`Request failed with ${response.status}`);
			}

			const markup = await response.text();
			const tagName =
				response.headers.get(RENDERED_COMPONENT_TAG_NAME_HEADER) ?? extractTagNameFromMarkup(markup);
			await ensureFragmentClientModule(tagName, response.headers.get(RENDERED_COMPONENT_CLIENT_MODULE_HEADER));

			state.ssrStatus = 'ready';
			state.ssrGeneratedAt = response.headers.get(RENDERED_COMPONENT_GENERATED_AT_HEADER) ?? 'n/a';
			state.ssrMarkup = markup;
			state.ssrTagName = tagName;
		} catch (error) {
			state.ssrStatus = 'error';
			state.ssrGeneratedAt = 'n/a';
			state.ssrMarkup = error instanceof Error ? error.message : 'Unknown error';
		}

		options.requestRender?.();
	}

	return (
		<main class="shell">
			{options.bootstrapStateScript}
			<section class="hero">
				<p class="eyebrow">Radiant Playground</p>
				<h1>Vite + Nitro with Ecopages JSX and RadiantComponent</h1>
				<p class="lede">
					This workspace uses <code>jsxImportSource: &quot;@ecopages/jsx&quot;</code> in TypeScript, so every{' '}
					<code>.tsx</code> file targets the Ecopages JSX runtime without per-file pragmas.
				</p>
			</section>

			<section class="panel panel--stack">
				<div class="panel-header">
					<h2>RadiantComponent lab</h2>
				</div>
				<p>
					The adapted JSX-first custom elements now live here instead of the pure Vite playground. This panel
					shows the live client-hydrated host, while the SSR route below shows the host-aware server-rendered
					fragment produced by <code>renderHostToString()</code>.
				</p>
				<div class="component-grid">
					<radiant-component-counter count={2} />
					<radiant-event-binding-lab />
					<radiant-context-flow-shell />
					<radiant-signal-release-board />
					<radiant-slot-studio-board>
						<p slot="eyebrow" class="component-tag">
							Creative composition lab
						</p>
						<h3 slot="heading">Launch board with projected planning rails</h3>
						<div slot="sidebar" class="studio-note-stack">
							<p class="studio-note-stack__title">Sidebar checklist</p>
							<ul class="studio-checklist">
								<li>Slots define editorial regions.</li>
								<li>Nested consumers mirror shared context.</li>
								<li>Buttons mutate provider state in place.</li>
							</ul>
						</div>
						<div class="studio-story">
							<p class="component-copy">
								This board mixes a composed header, sidebar, and body with context-driven subcomponents
								so the projection model feels useful beyond a simple card shell.
							</p>
							<p class="component-copy">
								Use it as a pattern for dashboards, release notes, or guided workflows where consumers
								need shared state but the host still wants authored content regions.
							</p>
						</div>
						<radiant-component-counter count={5} label="Projected slot counter" />
						<p slot="footer" class="studio-footer">
							Footer slot: treat this as the handoff rail for approvals, publishing notes, or last-mile
							QA.
						</p>
					</radiant-slot-studio-board>
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>SSR route</h2>
					<div class="component-actions">
						<button
							type="button"
							on:click={() => loadSsrMarkup('/api/ssr/radiant-component')}
							disabled={state.ssrStatus === 'loading'}
						>
							{state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch counter fragment'}
						</button>
						<button
							type="button"
							on:click={() => loadSsrMarkup('/api/ssr/radiant-component-server-card')}
							disabled={state.ssrStatus === 'loading'}
						>
							{state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch server-card fragment'}
						</button>
						<button
							type="button"
							on:click={() => loadSsrMarkup('/api/ssr/radiant-signal-release-board')}
							disabled={state.ssrStatus === 'loading'}
						>
							{state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch signal-board fragment'}
						</button>
					</div>
				</div>
				<p class="status" data-ref="ssr-status" data-status={state.ssrStatus}>
					Status: {state.ssrStatus}
				</p>
				<p>
					Nitro returns a real <code>{state.ssrTagName}</code> HTML fragment plus a client module URL. The
					counter example is already registered in the shell, while the server-card and signal-board fragments
					load richer client modules before the markup is inserted here.
				</p>
				<p data-generated-at={state.ssrGeneratedAt}>Generated at: {state.ssrGeneratedAt}</p>
				<pre class="ssr-html" data-ref="ssr-html">
					{state.ssrMarkup || 'SSR output will appear here.'}
				</pre>
				<div class="ssr-preview" data-ref="ssr-preview" data-tag-name={state.ssrTagName}>
					{options.ssrPreviewContent ?? <p>No SSR markup loaded yet.</p>}
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Client state</h2>
					<button type="button" on:click={incrementClicks}>
						Increment
					</button>
				</div>
				<p>
					Clicks: <strong>{options.clicksContent ?? state.clicks}</strong>
				</p>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Nitro route</h2>
					<button
						data-ref="nitro-fetch-button"
						type="button"
						on:click={loadServerMessage}
						disabled={options.nitroButtonDisabled ?? state.status === 'loading'}
					>
						{options.nitroButtonLabelContent ??
							(state.status === 'loading' ? 'Loading...' : 'Fetch /api/hello')}
					</button>
				</div>
				<p class="status" data-ref="nitro-status" data-status={options.nitroStatusAttribute ?? state.status}>
					Status: {options.nitroStatusContent ?? state.status}
				</p>
				<p data-ref="nitro-message">{options.nitroMessageContent ?? state.message}</p>
				<p>
					Server time:{' '}
					<span data-ref="nitro-server-time">{options.nitroServerTimeContent ?? state.serverTime}</span>
				</p>
			</section>
		</main>
	);
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

async function ensureFragmentClientModule(tagName: string, clientModuleKey: string | null) {
	if (customElements.get(tagName)) {
		return;
	}

	if (!clientModuleKey) {
		throw new Error(`Missing fragment client module for ${tagName}.`);
	}

	await loadRadiantClientModule(clientModuleKey);

	if (!customElements.get(tagName)) {
		throw new Error(`Client module ${clientModuleKey} did not register ${tagName}.`);
	}

	await customElements.whenDefined(tagName);
}
