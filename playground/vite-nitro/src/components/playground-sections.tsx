import type { JsxRenderable } from '@ecopages/jsx';
import { computed } from '@ecopages/signals';
import { createClientPreview, DEFAULT_SSR_ENDPOINT, loadServerMessage, loadSsrMarkup } from '../store/actions';
import { useAppStore } from '../store/store';
import { RadiantControllerContextVisualizer } from './radiant-controller-context-visualizer';
import { RadiantControllerDecoratorVisualizer } from './radiant-controller-decorator-visualizer';

export function HeroSection() {
	return (
		<section class="hero">
			<p class="eyebrow">Radiant Kitchen Sink</p>
			<h1>Radiant kitchen sink for Vite + Nitro hydration and SSR</h1>
			<p class="lede">
				This kitchen sink is meant to be the full-stack showcase: custom elements, signals, context, slots,
				server-rendered fragments, and client hydration all running together inside a Nitro app backed by Vite
				and the Ecopages JSX runtime.
			</p>
		</section>
	);
}

export function RadiantElementLabSection() {
	return (
		<section class="panel panel--stack">
			<div class="panel-header">
				<h2>RadiantElement lab</h2>
			</div>
			<p>
				Use this as the kitchen-sink surface for Radiant authoring patterns. The host below hydrates client
				components in place, while the SSR panel exercises Nitro-rendered fragments that are progressively
				upgraded with the matching client module.
			</p>
			<div class="component-grid">
				<radiant-counter count={2} />
				<radiant-event-binding-lab></radiant-event-binding-lab>
				<radiant-context-flow-shell></radiant-context-flow-shell>
				<radiant-signal-release-board></radiant-signal-release-board>
				<RadiantControllerDecoratorVisualizer />
				<RadiantControllerContextVisualizer />
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
					<radiant-counter count={5} label="Projected slot counter" />
					<p slot="footer" class="studio-footer">
						Footer slot: treat this as the handoff rail for approvals, publishing notes, or last-mile QA.
					</p>
				</radiant-slot-studio-board>
			</div>
		</section>
	);
}

export function SsrRouteSection({ ssrPreviewContent }: { ssrPreviewContent?: JsxRenderable }) {
	const store = useAppStore();
	const assetItems = computed(() => {
		if (store.ssrAssets.length === 0) {
			return [<li>No fragment assets recorded yet.</li>];
		}

		return store.ssrAssets.map((asset) => {
			if (asset.kind === 'script-module') {
				return <li>{`${asset.kind}:${asset.stage ?? 'hydrate'} ${asset.src}`}</li>;
			}

			if (asset.kind === 'modulepreload') {
				return <li>{`${asset.kind}:${asset.href}`}</li>;
			}

			return (
				<li>{asset.media ? `${asset.kind}:${asset.href} (${asset.media})` : `${asset.kind}:${asset.href}`}</li>
			);
		});
	});
	const status = computed(() => store.ssrStatus);
	const isLoading = computed(() => store.ssrStatus === 'loading');
	const generatedAt = computed(() => store.ssrGeneratedAt);
	const markup = computed(() => store.ssrMarkup || 'SSR output will appear here.');
	const tagName = computed(() => store.ssrTagName);
	const preview = ssrPreviewContent ?? computed(() => createClientPreview(store));

	async function loadSsrRoute(endpoint = DEFAULT_SSR_ENDPOINT) {
		await loadSsrMarkup(store, endpoint);
	}

	return (
		<section class="panel">
			<div class="panel-header">
				<h2>SSR route</h2>
				<div class="component-actions">
					<button type="button" on:click={() => loadSsrRoute(DEFAULT_SSR_ENDPOINT)} disabled={isLoading}>
						Fetch counter fragment
					</button>
					<button
						type="button"
						on:click={() => loadSsrRoute('/api/ssr/radiant-server-card')}
						disabled={isLoading}
					>
						Fetch server-card fragment
					</button>
					<button
						type="button"
						on:click={() => loadSsrRoute('/api/ssr/radiant-signal-release-board')}
						disabled={isLoading}
					>
						Fetch signal-board fragment
					</button>
					<button
						type="button"
						on:click={() => loadSsrRoute('/api/ssr/radiant-controller-decorator-visualizer')}
						disabled={isLoading}
					>
						Fetch controller-decorator fragment
					</button>
					<button
						type="button"
						on:click={() => loadSsrRoute('/api/ssr/radiant-controller-context-visualizer')}
						disabled={isLoading}
					>
						Fetch controller-context fragment
					</button>
					<button
						type="button"
						on:click={() => loadSsrRoute('/api/ssr/radiant-counter-asset-demo')}
						disabled={isLoading}
					>
						Fetch asset-backed fragment
					</button>
				</div>
			</div>
			<p class="status" data-ref="ssr-status" data-status={status}>
				Status: {status}
			</p>
			<p>
				Nitro returns a real <code>{tagName}</code> HTML fragment plus the normalized asset metadata needed to
				activate it. The counter example only needs the hydration module, while richer routes can add stylesheet
				or preload assets before the markup is inserted here.
			</p>
			<p data-generated-at={generatedAt}>Generated at: {generatedAt}</p>
			<div class="panel-subsection">
				<h3>Assets</h3>
				<ul class="component-copy component-copy--asset-list" data-ref="ssr-assets">
					{assetItems}
				</ul>
			</div>
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
	const store = useAppStore();
	const clicks = computed(() => store.clicks);

	function incrementClicks() {
		store.clicks += 1;
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
	const store = useAppStore();
	const status = computed(() => store.status);
	const message = computed(() => store.message);
	const serverTime = computed(() => store.serverTime);
	const isLoading = computed(() => store.status === 'loading');
	const buttonLabel = computed(() => (store.status === 'loading' ? 'Loading...' : 'Fetch /api/hello'));

	async function loadNitroRouteMessage() {
		await loadServerMessage(store);
	}

	return (
		<section class="panel">
			<div class="panel-header">
				<h2>Nitro route</h2>
				<button
					data-ref="nitro-fetch-button"
					type="button"
					on:click={loadNitroRouteMessage}
					disabled={isLoading}
				>
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
