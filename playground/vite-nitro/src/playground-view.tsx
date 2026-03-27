import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import type { RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { escapeScriptJson } from '@ecopages/radiant/tools/escape-script-json';
import { stringifyTyped } from '@ecopages/radiant/tools/stringify-typed';

/** Attribute marker used to find the one-shot SSR bootstrap payload for the playground shell. */
export const PLAYGROUND_STATE_SCRIPT_ATTRIBUTE = 'data-playground-state';

/** Serializable client bootstrap state used by the Nitro playground shell. */
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

/** UI actions exposed to the playground view. */
export type PlaygroundCallbacks = {
	incrementClicks: () => void;
	loadServerMessage: () => void | Promise<void>;
	loadSsrMarkup: (endpoint?: string) => void | Promise<void>;
};

/**
 * Optional view fragments that let the client entrypoint swap specific regions
 * with finer-grained bindings while keeping the SSR shell stable.
 */
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
};

/** Serializes the page-level playground state for SSR bootstrap. */
export function serializePlaygroundState(state: PlaygroundState): string {
	return stringifyTyped<PlaygroundState, string>(state);
}

/** Parses the SSR bootstrap payload for the page-level playground state. */
export function parsePlaygroundState(serializedState?: string): PlaygroundState | undefined {
	if (!serializedState) {
		return undefined;
	}

	try {
		return JSON.parse(serializedState) as PlaygroundState;
	} catch {
		return undefined;
	}
}

/** Creates the static JSON script node used during the initial SSR hydration pass. */
export function createPlaygroundStateScriptNode(serializedState: string): JsxRenderable {
	return createMarkupNodeLike(
		`<script type="application/json" ${PLAYGROUND_STATE_SCRIPT_ATTRIBUTE}>${escapeScriptJson(serializedState)}</script>`,
	);
}

/** Creates the initial page state from an optional canonical SSR fragment payload. */
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

/**
 * Renders the Nitro playground shell used by both the server response and the
 * hydrated client entrypoint.
 */
export function renderPlaygroundView(
	state: PlaygroundState,
	callbacks: PlaygroundCallbacks,
	options: PlaygroundViewOptions = {},
) {
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
							on:click={() => callbacks.loadSsrMarkup('/api/ssr/radiant-component')}
							disabled={state.ssrStatus === 'loading'}
						>
							{state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch counter fragment'}
						</button>
						<button
							type="button"
							on:click={() => callbacks.loadSsrMarkup('/api/ssr/radiant-component-server-card')}
							disabled={state.ssrStatus === 'loading'}
						>
							{state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch server-card fragment'}
						</button>
						<button
							type="button"
							on:click={() => callbacks.loadSsrMarkup('/api/ssr/radiant-signal-release-board')}
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
				<pre class="ssr-html" data-ref="ssr-html">{state.ssrMarkup || 'SSR output will appear here.'}</pre>
				<div class="ssr-preview" data-ref="ssr-preview" data-tag-name={state.ssrTagName}>
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
					Clicks: <strong>{options.clicksContent ?? state.clicks}</strong>
				</p>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Nitro route</h2>
					<button
						data-ref="nitro-fetch-button"
						type="button"
						on:click={callbacks.loadServerMessage}
						disabled={options.nitroButtonDisabled ?? (state.status === 'loading')}
					>
						{options.nitroButtonLabelContent ?? (state.status === 'loading' ? 'Loading...' : 'Fetch /api/hello')}
					</button>
				</div>
				<p class="status" data-ref="nitro-status" data-status={options.nitroStatusAttribute ?? state.status}>
					Status: {options.nitroStatusContent ?? state.status}
				</p>
				<p data-ref="nitro-message">{options.nitroMessageContent ?? state.message}</p>
				<p>
					Server time: <span data-ref="nitro-server-time">{options.nitroServerTimeContent ?? state.serverTime}</span>
				</p>
			</section>
		</main>
	);
}
