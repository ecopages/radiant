import type { JsxChild } from '@ecopages/jsx';

export type SsrCounterPayload = {
	generatedAt: string;
	markup: string;
	tagName: string;
};

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

export type PlaygroundCallbacks = {
	incrementClicks: () => void;
	loadServerMessage: () => void | Promise<void>;
	loadSsrMarkup: () => void | Promise<void>;
};

export type PlaygroundViewOptions = {
	ssrPreviewContent?: JsxChild;
};

export function encodePlaygroundState(state: PlaygroundState): string {
	return encodeURIComponent(JSON.stringify(state));
}

export function decodePlaygroundState(value?: string): PlaygroundState | undefined {
	if (!value) {
		return undefined;
	}

	try {
		return JSON.parse(decodeURIComponent(value)) as PlaygroundState;
	} catch {
		return undefined;
	}
}

export function createInitialPlaygroundState(initialSsrPayload?: SsrCounterPayload): PlaygroundState {
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
export function renderPlaygroundView(
	state: PlaygroundState,
	callbacks: PlaygroundCallbacks,
	options: PlaygroundViewOptions = {},
) {
	return (
		<main class="shell" data-playground-state={encodePlaygroundState(state)}>
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
					The adapted JSX-first custom elements now live here instead of the pure Vite playground. They
					exercise the new <code>render()</code> and <code>update()</code> contract directly.
				</p>
				<div class="component-grid">
					<radiant-component-counter count={2} label="Counter migrated to RadiantComponent" />
					<radiant-component-server-card />
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>SSR route</h2>
					<button type="button" on:click={callbacks.loadSsrMarkup} disabled={state.ssrStatus === 'loading'}>
						{state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch SSR HTML fragment'}
					</button>
				</div>
				<p class="status" data-status={state.ssrStatus}>
					Status: {state.ssrStatus}
				</p>
				<p>
					Nitro returns a real <code>{state.ssrTagName}</code> HTML fragment directly. The page already has
					the client bundle loaded, so the custom element hydrates that existing DOM when the fragment is
					inserted here.
				</p>
				<p data-generated-at={state.ssrGeneratedAt}>Generated at: {state.ssrGeneratedAt}</p>
				<pre class="ssr-html">{state.ssrMarkup || 'SSR output will appear here.'}</pre>
				<div class="ssr-preview" data-tag-name={state.ssrTagName}>
					{options.ssrPreviewContent ?? <p>No SSR markup loaded yet.</p>}
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Client state</h2>
					<button type="button" on:click={callbacks.incrementClicks}>
						Increment
					</button>
				</div>
				<p>
					Clicks: <strong>{state.clicks}</strong>
				</p>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Nitro route</h2>
					<button type="button" on:click={callbacks.loadServerMessage} disabled={state.status === 'loading'}>
						{state.status === 'loading' ? 'Loading...' : 'Fetch /api/hello'}
					</button>
				</div>
				<p class="status" data-status={state.status}>
					Status: {state.status}
				</p>
				<p>{state.message}</p>
				<p>Server time: {state.serverTime}</p>
			</section>
		</main>
	);
}
