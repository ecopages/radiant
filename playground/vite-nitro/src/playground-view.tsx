import type { JsxRenderable } from '@ecopages/jsx';
import { computed } from '@ecopages/signals';
import {
	DEFAULT_SSR_ENDPOINT,
	createClientPreviewContent,
	loadServerMessageIntoState,
	loadSsrMarkupIntoState,
} from './playground-actions';
import { usePlaygroundState } from './playground-state';

export function HeroSection() {
	return (
		<section class="hero">
			<p class="eyebrow">Radiant Playground</p>
			<h1>Radiant kitchen sink for Vite + Nitro hydration and SSR</h1>
			<p class="lede">
				This playground is meant to be the full-stack showcase: custom elements, signals, context, slots,
				server-rendered fragments, and client hydration all running together inside a Nitro app backed by Vite
				and the Ecopages JSX runtime.
			</p>
		</section>
	);
}

export function RadiantComponentLabSection() {
	return (
		<section class="panel panel--stack">
			<div class="panel-header">
				<h2>RadiantComponent lab</h2>
			</div>
			<p>
				Use this as the kitchen-sink surface for Radiant authoring patterns. The host below hydrates client
				components in place, while the SSR panel exercises Nitro-rendered fragments that are progressively
				upgraded with the matching client module.
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
							This board mixes a composed header, sidebar, and body with context-driven subcomponents so
							the projection model feels useful beyond a simple card shell.
						</p>
						<p class="component-copy">
							Use it as a pattern for dashboards, release notes, or guided workflows where consumers need
							shared state but the host still wants authored content regions.
						</p>
					</div>
					<radiant-component-counter count={5} label="Projected slot counter" />
					<p slot="footer" class="studio-footer">
						Footer slot: treat this as the handoff rail for approvals, publishing notes, or last-mile QA.
					</p>
				</radiant-slot-studio-board>
			</div>
		</section>
	);
}

export function SsrRouteSection({ ssrPreviewContent }: { ssrPreviewContent?: JsxRenderable }) {
	const state = usePlaygroundState();
	const status = computed(() => state.ssrStatus);
	const isLoading = computed(() => state.ssrStatus === 'loading');
	const generatedAt = computed(() => state.ssrGeneratedAt);
	const markup = computed(() => state.ssrMarkup || 'SSR output will appear here.');
	const tagName = computed(() => state.ssrTagName);
	const counterLabel = computed(() => (state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch counter fragment'));
	const serverCardLabel = computed(() =>
		state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch server-card fragment',
	);
	const signalBoardLabel = computed(() =>
		state.ssrStatus === 'loading' ? 'Rendering...' : 'Fetch signal-board fragment',
	);
	const preview = ssrPreviewContent ?? computed(() => createClientPreviewContent(state));

	async function loadSsrMarkup(endpoint = DEFAULT_SSR_ENDPOINT) {
		await loadSsrMarkupIntoState(state, endpoint);
	}

	return (
		<section class="panel">
			<div class="panel-header">
				<h2>SSR route</h2>
				<div class="component-actions">
					<button type="button" on:click={() => loadSsrMarkup(DEFAULT_SSR_ENDPOINT)} disabled={isLoading}>
						{counterLabel}
					</button>
					<button
						type="button"
						on:click={() => loadSsrMarkup('/api/ssr/radiant-component-server-card')}
						disabled={isLoading}
					>
						{serverCardLabel}
					</button>
					<button
						type="button"
						on:click={() => loadSsrMarkup('/api/ssr/radiant-signal-release-board')}
						disabled={isLoading}
					>
						{signalBoardLabel}
					</button>
				</div>
			</div>
			<p class="status" data-ref="ssr-status" data-status={status}>
				Status: {status}
			</p>
			<p>
				Nitro returns a real <code>{tagName}</code> HTML fragment plus a client module URL. The counter example
				is already registered in the shell, while the server-card and signal-board fragments load richer client
				modules before the markup is inserted here.
			</p>
			<p data-generated-at={generatedAt}>Generated at: {generatedAt}</p>
			<pre class="ssr-html" data-ref="ssr-html">
				{markup}
			</pre>
			<div class="ssr-preview" data-ref="ssr-preview" data-tag-name={tagName}>
				{preview}
			</div>
		</section>
	);
}

export function ClientStateSection() {
	const state = usePlaygroundState();
	const clicks = computed(() => state.clicks);

	function incrementClicks() {
		state.clicks += 1;
	}

	return (
		<section class="panel">
			<div class="panel-header">
				<h2>Client state</h2>
				<button type="button" on:click={incrementClicks}>
					Increment
				</button>
			</div>
			<p>
				Clicks: <strong>{clicks}</strong>
			</p>
		</section>
	);
}

export function NitroRouteSection() {
	const state = usePlaygroundState();
	const status = computed(() => state.status);
	const message = computed(() => state.message);
	const serverTime = computed(() => state.serverTime);
	const isLoading = computed(() => state.status === 'loading');
	const buttonLabel = computed(() => (state.status === 'loading' ? 'Loading...' : 'Fetch /api/hello'));

	async function loadServerMessage() {
		await loadServerMessageIntoState(state);
	}

	return (
		<section class="panel">
			<div class="panel-header">
				<h2>Nitro route</h2>
				<button data-ref="nitro-fetch-button" type="button" on:click={loadServerMessage} disabled={isLoading}>
					{buttonLabel}
				</button>
			</div>
			<p class="status" data-ref="nitro-status" data-status={status}>
				Status: {status}
			</p>
			<p data-ref="nitro-message">{message}</p>
			<p>
				Server time: <span data-ref="nitro-server-time">{serverTime}</span>
			</p>
		</section>
	);
}
