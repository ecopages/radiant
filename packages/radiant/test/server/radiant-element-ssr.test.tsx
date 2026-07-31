// @vitest-environment happy-dom
import '../../src/server/install-ssr-runtime';
import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { ContextProvider, createContext, onContextUpdate, provideContext } from '../../src/context';
import { installRadiantHydrator, uninstallRadiantHydrator } from '../../src/client/hydrator';
import { setCustomElementTagName } from '../../src/core/custom-element-metadata';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { querySlot } from '../../src/decorators/query-slot';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';
import type { WritableSignal } from '@ecopages/signals';
import { createCustomElement } from '../utils/create-custom-element';
import { resolveSsrContextValue } from '../../src/server/context-ssr';
import {
	renderRadiantElementHostToString,
	renderRadiantElementViewToString,
} from '../../src/server/radiant-element-ssr';
import { assertLightDomSsrSupported } from '../../src/server/element-ssr/assert-light-dom-ssr';
import { renderComponentToString } from '../../src/server/render-component';
import { createServerRenderEnvironment, installLightDomShim } from '../../src/server/light-dom-shim';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

@customElement('ssr-array-prop-card-test')
class SsrArrayPropCard extends RadiantElement {
	@prop({ type: Array }) items = [] as Array<{ label: string }>;

	override render() {
		return <p>{this.items.map((item) => item.label).join(', ') || 'empty'}</p>;
	}
}

@customElement('server-host-slot-query-card-test')
class ServerHostSlotQueryCard extends RadiantElement {
	@querySlot() defaultSlot!: HTMLParagraphElement | null;
	@querySlot({ name: 'header' }) headerSlot!: HTMLHeadingElement | null;

	override render() {
		return (
			<section
				data-default-slot={this.defaultSlot?.textContent ?? 'missing'}
				data-header-slot={this.headerSlot?.textContent ?? 'missing'}
			>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
			</section>
		);
	}
}

describe('RadiantElement SSR', () => {
	beforeEach(() => {
		uninstallRadiantHydrator();
		document.body.innerHTML = '';
	});

	test('renderRadiantElementViewToString() serializes the current view without connecting', () => {
		class ServerGreetingCard extends RadiantElement {
			message = 'Hello SSR';

			override render() {
				return <p data-ref="message">{this.message}</p>;
			}
		}

		customElements.define('server-greeting-card-test', ServerGreetingCard);

		const element = createCustomElement<ServerGreetingCard>('server-greeting-card-test');

		expect(renderRadiantElementViewToString(element)).toBe('<p data-ref="message">Hello SSR</p>');
	});

	test('renderRadiantElementHostToString() rejects shadow renderRootMode hosts', () => {
		@customElement('server-shadow-host-card-test')
		class ServerShadowHostCard extends RadiantElement {
			override readonly renderRootMode = 'shadow';

			override render() {
				return <p>shadow</p>;
			}
		}

		const element = createCustomElement<ServerShadowHostCard>('server-shadow-host-card-test');

		expect(() => renderRadiantElementHostToString(element)).toThrow(/light-DOM only/);
	});

	test('renderRadiantElementViewToString() rejects shadow renderRootMode hosts', () => {
		@customElement('server-shadow-view-card-test')
		class ServerShadowViewCard extends RadiantElement {
			override readonly renderRootMode = 'shadow';

			override render() {
				return <p>shadow</p>;
			}
		}

		const element = createCustomElement<ServerShadowViewCard>('server-shadow-view-card-test');

		expect(() => renderRadiantElementViewToString(element)).toThrow(/light-DOM only/);
	});

	test('assertLightDomSsrSupported() rejects InternalRadiantSsrHost snapshots with shadow mode', () => {
		expect(() =>
			assertLightDomSsrSupported({
				constructor: class ShadowSnapshotHost {},
				renderRootMode: 'shadow',
			}),
		).toThrow(/light-DOM only/);
	});

	test('renderRadiantElementHostToString() serializes the host and current view', () => {
		class ServerHostGreetingCard extends RadiantElement {
			message = 'Hello host SSR';

			override render() {
				return <p data-ref="message">{this.message}</p>;
			}
		}

		customElement('server-host-greeting-card-test')(ServerHostGreetingCard);

		const element = createCustomElement<ServerHostGreetingCard>('server-host-greeting-card-test');

		expect(renderRadiantElementHostToString(element)).toBe(
			'<server-host-greeting-card-test><p data-ref="message">Hello host SSR</p></server-host-greeting-card-test>',
		);
	});

	test('renderRadiantElementViewToString() serializes projected default-slot content when render() is omitted', () => {
		class ServerPassthroughCard extends RadiantElement {}

		customElements.define('server-passthrough-card-test', ServerPassthroughCard);

		const element = createCustomElement<ServerPassthroughCard>('server-passthrough-card-test');
		element.innerHTML = '<p>Projected body</p><button type="button">Open</button>';

		expect(renderRadiantElementViewToString(element)).toBe(
			'<p>Projected body</p><button type="button">Open</button>',
		);
	});

	test('renderRadiantElementHostToString() serializes the host tag and reactive attributes', () => {
		installLightDomShim();

		@customElement('server-host-card-test')
		class ServerHostCard extends RadiantElement {
			@prop({ type: Number, reflect: true, defaultValue: 3 }) count!: number;
			@prop({ type: String, defaultValue: 'Host SSR' }) label!: string;

			override render() {
				return <p data-ref="message">{this.label}</p>;
			}
		}

		const element = new ServerHostCard();
		element.count = 7;
		element.label = 'Host ready';

		expect(renderRadiantElementHostToString(element)).toBe(
			'<server-host-card-test count="7" label="Host ready"><p data-ref="message">Host ready</p></server-host-card-test>',
		);
	});

	test('renderRadiantElementHostToString() preserves nested registered Radiant consumer hosts and finalized parent context hydration state', () => {
		const nestedSsrBoardContext = createContext<{ commits: number; owner: string; stage: string; tempo: string }>(
			Symbol('nested-radiant-board-context'),
		);

		class NestedSsrSummaryCard extends RadiantElement<{ summary: string }> {
			@state summary = 'Awaiting board context';

			@onContextUpdate({ context: nestedSsrBoardContext })
			protected syncSummary(currentContext: { commits: number; owner: string; stage: string }): void {
				this.summary = `${currentContext.owner} is steering ${currentContext.stage.toLowerCase()} with ${currentContext.commits} commits.`;
			}

			override render() {
				return <p class="nested-summary">{this.$.summary}</p>;
			}
		}

		class NestedSsrInsightCard extends RadiantElement<{ value: string }> {
			@state value = 'Pending';

			@onContextUpdate({ context: nestedSsrBoardContext })
			protected syncValue(currentContext: { commits: number; stage: string; tempo: string }): void {
				this.value = `${currentContext.stage} / ${currentContext.tempo} / ${currentContext.commits}`;
			}

			override render() {
				return <p class="nested-insight">Stage: {this.$.value}</p>;
			}
		}

		class NestedSsrBoardCard extends RadiantElement {
			@provideContext({
				context: nestedSsrBoardContext,
				initialValue: {
					commits: 3,
					owner: 'Design systems',
					stage: 'Build',
					tempo: 'Calm',
				},
				hydrate: Object,
			})
			context!: ContextProvider<typeof nestedSsrBoardContext>;

			override render() {
				return (
					<section class="nested-board">
						<nested-ssr-summary-card-test />
						<nested-ssr-insight-card-test />
					</section>
				);
			}
		}

		setCustomElementTagName(NestedSsrSummaryCard, 'nested-ssr-summary-card-test');
		setCustomElementTagName(NestedSsrInsightCard, 'nested-ssr-insight-card-test');
		setCustomElementTagName(NestedSsrBoardCard, 'nested-ssr-board-card-test');

		customElements.define('nested-ssr-summary-card-test', NestedSsrSummaryCard);

		customElements.define('nested-ssr-insight-card-test', NestedSsrInsightCard);

		customElements.define('nested-ssr-board-card-test', NestedSsrBoardCard);

		const html = renderRadiantElementHostToString(new NestedSsrBoardCard(), { mode: 'hydrate' });

		expect(html).toContain('<nested-ssr-board-card-test>');
		expect(html).toContain('<nested-ssr-summary-card-test>');
		expect(html).toContain('Design systems is steering build with 3 commits.');
		expect(html).toContain('<nested-ssr-insight-card-test>');
		expect(html).toContain('Stage: Build / Calm / 3');
		expect(html).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(html).toContain('{"commits":3,"owner":"Design systems","stage":"Build","tempo":"Calm"}');
		expect(html).not.toContain('Awaiting board context');
		expect(html).not.toContain('Stage: Pending');
	});

	test('renderComponentToString() applies array @prop values before the first server render', async () => {
		const html = await renderComponentToString<SsrArrayPropCard>(SsrArrayPropCard, {
			initialize: (component) => {
				component.items = [{ label: 'first' }, { label: 'second' }];
			},
			renderOptions: { mode: 'plain' },
		});

		expect(html).toContain(
			'<ssr-array-prop-card-test items="[{&quot;label&quot;:&quot;first&quot;},{&quot;label&quot;:&quot;second&quot;}]">',
		);
		expect(html).toContain('<p>first, second</p>');
		expect(html).not.toContain('[object Object]');
	});

	test('explicit SSR setup remains a safe no-op when a DOM is already available', () => {
		const initialRegistry = globalThis.customElements;
		const initialHTMLElement = globalThis.HTMLElement;
		const initialWindow = globalThis.window;
		const initialBody = document.body;
		document.body.innerHTML = '<p data-preserved="true">kept</p>';
		const runtime = installLightDomShim();

		expect(runtime.customElements).toBe(initialRegistry);
		expect(runtime.HTMLElement).toBe(initialHTMLElement);
		expect(globalThis.window).toBe(initialWindow);
		expect(document.body).toBe(initialBody);
		expect(document.body.innerHTML).toBe('<p data-preserved="true">kept</p>');
	});

	test("renderRadiantElementHostToString({ mode: 'hydrate' }) keeps hydration output free of internal child markers", () => {
		@customElement('server-host-hydrate-card-test')
		class ServerHostHydrateCard extends RadiantElement {
			@prop({ type: Number, reflect: true, defaultValue: 3 }) count!: number;
			@prop({ type: String, defaultValue: 'SSR counter rendered in Nitro' }) label!: string;

			override render() {
				return (
					<section class="component-card component-card--counter">
						<p class="component-tag">RadiantElement</p>
						<h3>{this.label}</h3>
						<p class="component-copy">
							This card uses the new <code>render()</code> + <code>update()</code> flow instead of manual{' '}
							<code>render(template)</code> calls.
						</p>
						<p class="component-metric">Count: {this.count}</p>
					</section>
				);
			}
		}

		const element = new ServerHostHydrateCard();
		element.count = 28;
		element.label = 'SSR counter rendered in Nitro';

		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('<server-host-hydrate-card-test count="28" label="SSR counter rendered in Nitro">');
		expect(html).toContain('class="component-tag">RadiantElement</p>');
		expect(html).toContain('<h3>SSR counter rendered in Nitro</h3>');
		expect(html).toContain('class="component-metric">Count: 28</p>');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test("renderRadiantElementHostToString({ mode: 'hydrate' }) serializes bound JSX child values", () => {
		type ServerHostBoundHydrateCardBindings = {
			count: number;
			label: string;
		};

		@customElement('server-host-bound-hydrate-card-test')
		class ServerHostBoundHydrateCard extends RadiantElement<ServerHostBoundHydrateCardBindings> {
			@prop({ type: Number, reflect: true, defaultValue: 3, bind: true }) count!: number;
			@prop({ type: String, defaultValue: 'SSR counter rendered in Nitro' }) label!: string;

			override render() {
				return (
					<section class="component-card component-card--counter">
						<p class="component-tag">RadiantElement</p>
						<h3>{this.label}</h3>
						<p class="component-metric">Count: {this.bind('count')}</p>
					</section>
				);
			}
		}

		const element = new ServerHostBoundHydrateCard();
		element.count = 28;
		element.label = 'SSR counter rendered in Nitro';

		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain(
			'<server-host-bound-hydrate-card-test count="28" label="SSR counter rendered in Nitro">',
		);
		expect(html).toContain('<h3>SSR counter rendered in Nitro</h3>');
		expect(html).toContain('class="component-metric">Count: 28</p>');
		expect(html).not.toContain('[object Object]');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test("renderRadiantElementHostToString({ mode: 'hydrate' }) serializes very nested component trees", () => {
		type ServerHostDeepTreeBindings = {
			count: number;
			label: string;
		};

		@customElement('server-host-deep-tree-test')
		class ServerHostDeepTree extends RadiantElement<ServerHostDeepTreeBindings> {
			@prop({ type: String, defaultValue: 'Deep SSR' }) label!: string;
			@prop({ type: Number, reflect: true, defaultValue: 11, bind: true }) count!: number;

			override render() {
				return (
					<section class="deep-tree">
						<header>
							<h2>{this.label}</h2>
						</header>
						<article>
							<div>
								<p>
									Count: <strong>{this.bind('count')}</strong>
								</p>
								<ul>
									<li>
										<span>First</span>
									</li>
									<li>
										<span>Second</span>
									</li>
								</ul>
							</div>
						</article>
					</section>
				);
			}
		}

		const element = new ServerHostDeepTree();
		element.label = 'Deep SSR';
		element.count = 11;
		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('<server-host-deep-tree-test');
		expect(html).toContain('count="11"');
		expect(html).toContain('label="Deep SSR"');
		expect(html).toContain('<h2>Deep SSR</h2>');
		expect(html).toContain('<p>Count: <strong>11</strong></p>');
		expect(html).toContain('<li><span>First</span></li>');
		expect(html).toContain('<li><span>Second</span></li>');
		expect(html).not.toContain('[object Object]');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test('renderRadiantElementHostToString() derives host attributes from ordinary host state', () => {
		@customElement('server-host-override-card-test')
		class ServerHostOverrideCard extends RadiantElement {
			override render() {
				return <p>Override</p>;
			}
		}

		const element = new ServerHostOverrideCard();
		element.setAttribute('role', 'status');
		element.setAttribute('aria-live', 'polite');

		expect(renderRadiantElementHostToString(element)).toBe(
			'<server-host-override-card-test role="status" aria-live="polite"><p>Override</p></server-host-override-card-test>',
		);
	});

	test('renderRadiantElementHostToString() serializes projected slot content and embeds slot projection payload', () => {
		@customElement('server-host-slot-card-test')
		class ServerHostSlotCard extends RadiantElement {
			override render() {
				return (
					<section>
						<header>
							<slot name="header" />
						</header>
						<div>
							<slot />
						</div>
					</section>
				);
			}
		}

		const element = new ServerHostSlotCard();
		element.innerHTML = '<h2 slot="header">Server heading</h2><p>Server body</p>';

		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('<header><h2 slot="header">Server heading</h2></header>');
		expect(html).toContain('<div><p>Server body</p></div>');
		expect(html).toContain('data-radiant-slot-projection');
	});

	describeWhenStandard('SSR ordering with generated hydration scripts', () => {
		test("renderRadiantElementHostToString({ mode: 'hydrate' }) emits host content before slot projection and hydration scripts", () => {
			@customElement('server-host-ordering-card-test')
			class ServerHostOrderingCard extends RadiantElement {
				@signal({ hydrate: String, initial: 'idle' }) status!: WritableSignal<string>;

				override render() {
					return (
						<section>
							<slot />
							<p>{this.status}</p>
						</section>
					);
				}
			}

			const element = new ServerHostOrderingCard();
			element.innerHTML = '<p>Projected body</p>';
			element.status.set('ready');

			const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });
			const hostContentIndex = html.indexOf('<section><p>Projected body</p><p>ready</p></section>');
			const slotProjectionIndex = html.indexOf('data-radiant-slot-projection');
			const hydrationScriptIndex = html.indexOf('data-hydration-key="status"');

			expect(hostContentIndex).toBeGreaterThanOrEqual(0);
			expect(slotProjectionIndex).toBeGreaterThan(hostContentIndex);
			expect(hydrationScriptIndex).toBeGreaterThan(slotProjectionIndex);
		});
	});

	test('createServerRenderEnvironment() prepares authored content for server-side slot queries', () => {
		const environment = createServerRenderEnvironment();

		const element = new ServerHostSlotQueryCard();
		environment.prepareHost(element, {
			authoredContent: '<h2 slot="header">Prepared heading</h2><p>Prepared body</p>',
		});

		expect(renderRadiantElementHostToString(element, { mode: 'hydrate' })).toContain(
			'data-header-slot="Prepared heading"',
		);
	});

	test("renderRadiantElementHostToString({ mode: 'hydrate' }) appends provider hydration scripts automatically", () => {
		const serverContext = createContext<{ label: string; level: number }>(Symbol('server-context-card'));

		class ServerHostContextCard extends RadiantElement {
			declare context: ContextProvider<typeof serverContext>;

			constructor() {
				super();
				this.context = new ContextProvider(this, {
					context: serverContext,
					hydrationKey: 'context',
					initialValue: { label: 'SSR context', level: 4 },
					hydrate: Object,
				});
				this.registerContextProvider('context', this.context);
			}

			override render() {
				return <p>Provider host</p>;
			}
		}

		customElements.define('server-host-context-card-test', ServerHostContextCard);
		setCustomElementTagName(ServerHostContextCard, 'server-host-context-card-test');

		const element = new ServerHostContextCard();
		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('<server-host-context-card-test>');
		expect(html).toContain('<p>Provider host</p>');
		expect(html).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(html).toContain('{"label":"SSR context","level":4}');
	});

	test('preserves an authored hydration child script on an explicit Radiant server render', async () => {
		const scriptedContext = createContext<{ count: number; label: string }>(Symbol('scripted-radiant-context'));
		const tagName = 'scripted-radiant-provider-host-test';

		class ScriptedRadiantProviderHost extends RadiantElement {
			declare provider: ContextProvider<typeof scriptedContext>;

			constructor() {
				super();
				this.provider = new ContextProvider(this, {
					context: scriptedContext,
					hydrationKey: 'provider',
					initialValue: { count: 0, label: 'Pending' },
					hydrate: Object,
				});
				this.registerContextProvider('provider', this.provider);
			}

			override render() {
				const context = this.provider.getContext();

				return <p>{`${context.label} / ${context.count}`}</p>;
			}
		}

		customElements.define(tagName, ScriptedRadiantProviderHost);
		setCustomElementTagName(ScriptedRadiantProviderHost, tagName);

		const html = await renderComponentToString(ScriptedRadiantProviderHost, {
			authoredContent:
				'<script type="application/json" data-hydration="true" data-hydration-type="context" data-hydration-key="provider">{"count":3,"label":"Authored child"}</script>',
			renderOptions: { mode: 'plain' },
		});

		expect(html).toContain(`<${tagName}>`);
		expect(html).toContain('<p>Authored child / 3</p>');
		expect(html).not.toContain('data-radiant-slot-projection');
		expect(html).toContain('<script type="application/json"');
		expect(html).toContain('data-hydration="true"');
		expect(html).toContain('data-hydration-key="provider"');
		expect(html).toContain('{"count":3,"label":"Authored child"}</script>');
	});

	test("renderRadiantElementHostToString({ mode: 'plain' }) emits authored hydration markup before slot projection payloads", () => {
		@customElement('server-host-authored-hydration-order-card-test')
		class ServerHostAuthoredHydrationOrderCard extends RadiantElement {
			override render() {
				return (
					<section>
						<slot />
					</section>
				);
			}
		}

		const element = new ServerHostAuthoredHydrationOrderCard();
		element.innerHTML =
			'<p>Projected body</p>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>';

		const html = renderRadiantElementHostToString(element, { mode: 'plain' });
		const hostContentIndex = html.indexOf('<section><p>Projected body</p></section>');
		const authoredHydrationIndex = html.indexOf('data-hydration-key="provider"');
		const slotProjectionIndex = html.indexOf('data-radiant-slot-projection');

		expect(hostContentIndex).toBeGreaterThanOrEqual(0);
		expect(authoredHydrationIndex).toBeGreaterThan(hostContentIndex);
		expect(slotProjectionIndex).toBeGreaterThan(authoredHydrationIndex);
		expect(html.match(/data-hydration-key="provider"/g)).toHaveLength(1);
	});

	test('renderRadiantElementHostToString() preserves nested RadiantElement child hosts and parent hydration state', () => {
		const nestedContext = createContext<{ label: string; level: number }>(Symbol('nested-radiant-context'));
		const childTagName = 'nested-radiant-child-host-test';
		const parentTagName = 'nested-radiant-parent-host-test';

		class NestedRadiantChildHost extends RadiantElement {
			override render() {
				const context = resolveSsrContextValue(nestedContext);
				const summary = context ? `${context.label} / ${context.level}` : 'Pending context';

				return (
					<section class="nested-child-card">
						<h3>Nested child SSR</h3>
						<p>
							Context: <strong>{summary}</strong>
						</p>
					</section>
				);
			}
		}

		class NestedRadiantParentHost extends RadiantElement {
			declare context: ContextProvider<typeof nestedContext>;

			constructor() {
				super();
				this.context = new ContextProvider(this, {
					context: nestedContext,
					hydrationKey: 'context',
					initialValue: { label: 'Nitro SSR context', level: 2 },
					hydrate: Object,
				});
				this.registerContextProvider('context', this.context);
			}

			override render() {
				return (
					<section class="nested-parent-shell">
						<header>
							<h2>Parent shell</h2>
						</header>
						<nested-radiant-child-host-test />
					</section>
				);
			}
		}

		customElements.define(childTagName, NestedRadiantChildHost);
		customElements.define(parentTagName, NestedRadiantParentHost);
		setCustomElementTagName(NestedRadiantChildHost, childTagName);
		setCustomElementTagName(NestedRadiantParentHost, parentTagName);

		const parent = new NestedRadiantParentHost();
		const nestedHtml = renderRadiantElementHostToString(parent, { mode: 'hydrate' });

		expect(nestedHtml).toContain(`<${parentTagName}>`);
		expect(nestedHtml).toContain(`<${childTagName}>`);
		expect(nestedHtml).toContain('class="nested-child-card"');
		expect(nestedHtml).toContain('<h3>Nested child SSR</h3>');
		expect(nestedHtml).toContain('<p>Context: <strong>Nitro SSR context / 2</strong></p>');
		expect(nestedHtml).toContain('class="nested-parent-shell"');
		expect(nestedHtml).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(nestedHtml).toContain('{"label":"Nitro SSR context","level":2}');

		const parentHostHtml = renderRadiantElementHostToString(parent, { mode: 'hydrate' });

		expect(parentHostHtml).toContain(`<${parentTagName}>`);
		expect(parentHostHtml).toContain(`<${childTagName}>`);
		expect(parentHostHtml).toContain('class="nested-child-card"');
		expect(parentHostHtml).toContain('<h3>Nested child SSR</h3>');
		expect(parentHostHtml).toContain('<p>Context: <strong>Nitro SSR context / 2</strong></p>');
		expect(parentHostHtml).toContain('class="nested-parent-shell"');
		expect(parentHostHtml).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
	});

	describeWhenStandard('pre-connect SSR accessors', () => {
		test('createServerRenderEnvironment() resolves slot query accessors before connect', () => {
			const environment = createServerRenderEnvironment();
			const element = new ServerHostSlotQueryCard();

			environment.prepareHost(element, {
				authoredContent: '<h2 slot="header">Prepared heading</h2><p>Prepared body</p>',
			});

			expect(element.headerSlot?.textContent).toBe('Prepared heading');
			expect(element.defaultSlot?.textContent).toBe('Prepared body');
		});

		test.skip('hydrates array @prop values from SSR host attributes before the first client render (happy-dom; covered by ssr-hydrate.e2e)', async () => {
			const serverElement = new SsrArrayPropCard();
			serverElement.items = [{ label: 'first' }, { label: 'second' }];
			const serverMarkup = renderRadiantElementHostToString(serverElement, { mode: 'hydrate' });

			document.body.innerHTML = serverMarkup;

			const element = document.querySelector('ssr-array-prop-card-test') as SsrArrayPropCard;

			await waitFor(() => {
				expect(element.items).toEqual([{ label: 'first' }, { label: 'second' }]);
				expect(element.querySelector('p')?.textContent).toBe('first, second');
			});
		});

		test("renderRadiantElementHostToString({ mode: 'hydrate' }) appends signal hydration scripts automatically", () => {
			class ServerHostSignalCard extends RadiantElement {
				@signal({ hydrate: String, initial: 'idle' }) status!: WritableSignal<string>;

				override render() {
					return <p>{this.status}</p>;
				}
			}

			customElements.define('server-host-signal-card-test', ServerHostSignalCard);
			setCustomElementTagName(ServerHostSignalCard, 'server-host-signal-card-test');

			const element = new ServerHostSignalCard();
			element.status.set('ready');
			const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

			expect(html).toContain('<server-host-signal-card-test>');
			expect(html).toContain('<p>ready</p>');
			expect(html).toContain(
				'<script type="application/json" data-hydration data-hydration-type="signal" data-hydration-key="status">"ready"</script>',
			);
		});
	});

	test('hydrates SSR markup in place on connect', async () => {
		class HydratedCounter extends RadiantElement {
			count = 0;

			private readonly increment = () => {
				this.count += 1;
				this.update();
			};

			override render() {
				return (
					<button type="button" on:click={this.increment}>
						Count {this.count}
					</button>
				);
			}
		}

		customElements.define('hydrated-counter-test', HydratedCounter);

		const serverElement = createCustomElement<HydratedCounter>('hydrated-counter-test');
		const serverMarkup = renderRadiantElementViewToString(serverElement, { mode: 'hydrate' });
		installRadiantHydrator();

		document.body.innerHTML = `<hydrated-counter-test>${serverMarkup}</hydrated-counter-test>`;

		const element = document.querySelector('hydrated-counter-test') as HydratedCounter;
		const button = element.querySelector('button');

		expect(button).not.toBeNull();

		await waitFor(() => {
			expect(button?.getAttributeNames().some((name) => name.startsWith('data-radiant-jsx-bind-'))).toBe(false);
		});

		button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => {
			expect(element.querySelector('button')?.textContent).toBe('Count 1');
		});
	});

	test('hydrates SSR markup that uses slot projection payloads', async () => {
		@customElement('hydrated-slot-card-test')
		class HydratedSlotCard extends RadiantElement {
			count = 0;

			private readonly increment = () => {
				this.count += 1;
				this.update();
			};

			override render() {
				return (
					<section>
						<header>
							<slot name="header" />
						</header>
						<div>
							<slot />
						</div>
						<button type="button" on:click={this.increment}>
							Count {this.count}
						</button>
					</section>
				);
			}
		}

		const serverElement = new HydratedSlotCard();
		serverElement.innerHTML = '<h2 slot="header">SSR header</h2><p>SSR body</p>';
		const serverMarkup = renderRadiantElementHostToString(serverElement, { mode: 'hydrate' });
		installRadiantHydrator();

		document.body.innerHTML = serverMarkup;

		const element = document.querySelector('hydrated-slot-card-test') as HydratedSlotCard;

		await waitFor(() => {
			expect(element.querySelector('header > h2')?.textContent).toBe('SSR header');
			expect(element.querySelector('div > p')?.textContent).toBe('SSR body');
			expect(element.innerHTML).not.toContain('data-radiant-jsx-bind-');
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => {
			expect(element.querySelector('button')?.textContent).toBe('Count 1');
		});
	});

	test('hydrates slot projection payloads with multiple projected roots and quoted attributes', async () => {
		@customElement('hydrated-complex-slot-card-test')
		class HydratedComplexSlotCard extends RadiantElement {
			count = 0;

			private readonly increment = () => {
				this.count += 1;
				this.update();
			};

			override render() {
				return (
					<section>
						<header>
							<slot name="header" />
						</header>
						<div data-ref="body">
							<slot />
						</div>
						<footer>
							<slot name="footer" />
						</footer>
						<button type="button" on:click={this.increment}>
							Count {this.count}
						</button>
					</section>
				);
			}
		}

		const serverElement = new HydratedComplexSlotCard();
		serverElement.innerHTML =
			'<h2 slot="header" data-note="1 > 0">SSR header</h2><article data-kind="primary"><p>SSR body</p></article><radiant-component-counter count="4" label="Projected SSR counter"></radiant-component-counter><p slot="footer">SSR footer</p>';
		const serverMarkup = renderRadiantElementHostToString(serverElement, { mode: 'hydrate' });
		installRadiantHydrator();

		document.body.innerHTML = serverMarkup;

		const element = document.querySelector('hydrated-complex-slot-card-test') as HydratedComplexSlotCard;

		await waitFor(() => {
			expect(element.querySelector('header > h2')?.getAttribute('data-note')).toBe('1 > 0');
			expect(element.querySelector('[data-ref="body"] > article > p')?.textContent).toBe('SSR body');
			expect(element.querySelector('[data-ref="body"] > radiant-component-counter')?.getAttribute('count')).toBe(
				'4',
			);
			expect(element.querySelector('footer > p')?.textContent).toBe('SSR footer');
			expect(element.innerHTML).not.toContain('data-radiant-jsx-bind-');
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => {
			expect(element.querySelector('button')?.textContent).toBe('Count 1');
		});
	});

	test('SSR hosts fall back to a fresh client render when the explicit hydrator is not installed', async () => {
		class NonHydratedCounter extends RadiantElement {
			count = 0;

			override render() {
				return <button type="button">Count {this.count}</button>;
			}
		}

		customElements.define('non-hydrated-counter-test', NonHydratedCounter);

		const serverElement = createCustomElement<NonHydratedCounter>('non-hydrated-counter-test');
		const serverMarkup = renderRadiantElementViewToString(serverElement, { mode: 'hydrate' });

		document.body.innerHTML = `<non-hydrated-counter-test>${serverMarkup}</non-hydrated-counter-test>`;

		const element = document.querySelector('non-hydrated-counter-test') as NonHydratedCounter;
		const initialButton = element.querySelector('button');

		expect(initialButton).not.toBeNull();

		await waitFor(() => {
			expect(element.querySelector('button')).not.toBe(initialButton);
			expect(element.innerHTML).not.toContain('data-radiant-jsx-bind-');
		});
	});

	test('first-connect hydration ignores stale pre-connect update requests', async () => {
		class DeferredHydratedCard extends RadiantElement {
			count = 0;

			constructor() {
				super();
				this.count = 2;
				this.update();
			}

			private readonly increment = () => {
				this.count += 1;
				this.update();
			};

			override render() {
				return (
					<section>
						<h3>Hydrated card</h3>
						<p data-ref="count">Count: {this.count}</p>
						<div>
							<button type="button" on:click={this.increment}>
								Increment
							</button>
						</div>
					</section>
				);
			}
		}

		customElements.define('deferred-hydrated-card-test', DeferredHydratedCard);

		const serverElement = createCustomElement<DeferredHydratedCard>('deferred-hydrated-card-test');
		const serverMarkup = renderRadiantElementViewToString(serverElement, { mode: 'hydrate' });
		installRadiantHydrator();

		document.body.innerHTML = `<deferred-hydrated-card-test>${serverMarkup}</deferred-hydrated-card-test>`;

		const element = document.querySelector('deferred-hydrated-card-test') as DeferredHydratedCard;

		await waitFor(() => {
			expect(element.querySelectorAll('button')).toHaveLength(1);
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Count: 2');
			expect(element.innerHTML).not.toContain('data-radiant-jsx-bind-');
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Count: 3');
		});
	});
});
