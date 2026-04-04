import { waitFor } from '@testing-library/dom';
import { createStore, state as createSignalState, type WritableSignal } from '@ecopages/signals';
import { renderToString } from '@ecopages/jsx';
import { beforeEach, describe, expect, test } from 'vitest';
import { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { onContextUpdate } from '../../src/context/decorators/on-context-update';
import { provideContext } from '../../src/context/decorators/provide-context';
import { setCustomElementTagName } from '../../src/core/custom-element-metadata';
import { RadiantComponent } from '../../src/core/radiant-component';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { querySlot } from '../../src/decorators/query-slot';
import { reactiveProp } from '../../src/decorators/reactive-prop';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';
import { createServerRenderEnvironment, installLightDomShim } from '../../src/server/light-dom-shim';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

const nestedSsrBoardContext = createContext<{ commits: number; owner: string; stage: string; tempo: string }>(
	Symbol('nested-radiant-board-context'),
);

@customElement('nested-ssr-summary-card-test')
class NestedSsrSummaryCard extends RadiantComponent<{ summary: string }> {
	@state summary = 'Awaiting board context';

	@onContextUpdate({ context: nestedSsrBoardContext })
	protected syncSummary(currentContext: { commits: number; owner: string; stage: string }): void {
		this.summary = `${currentContext.owner} is steering ${currentContext.stage.toLowerCase()} with ${currentContext.commits} commits.`;
	}

	override render() {
		return <p class="nested-summary">{this.$.summary}</p>;
	}
}

@customElement('nested-ssr-insight-card-test')
class NestedSsrInsightCard extends RadiantComponent<{ value: string }> {
	@state value = 'Pending';

	@onContextUpdate({ context: nestedSsrBoardContext })
	protected syncValue(currentContext: { commits: number; stage: string; tempo: string }): void {
		this.value = `${currentContext.stage} / ${currentContext.tempo} / ${currentContext.commits}`;
	}

	override render() {
		return <p class="nested-insight">Stage: {this.$.value}</p>;
	}
}

@customElement('nested-ssr-board-card-test')
class NestedSsrBoardCard extends RadiantComponent {
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

@customElement('tracked-reactive-reads-card-test')
class TrackedReactiveReadsCard extends RadiantComponent {
	@prop({ type: String, defaultValue: 'Count' }) label = 'Count';
	@state count = 1;
	renderCount = 0;

	override render() {
		this.renderCount += 1;

		return (
			<button type="button" data-active={this.count === 1 ? 'yes' : 'no'} aria-pressed={this.count === 1}>
				{this.label}: {this.count}
			</button>
		);
	}
}

@customElement('ssr-array-prop-card-test')
class SsrArrayPropCard extends RadiantComponent {
	@prop({ type: Array }) items = [] as Array<{ label: string }>;

	override render() {
		return <p>{this.items.map((item) => item.label).join(', ') || 'empty'}</p>;
	}
}

@customElement('server-host-slot-query-card-test')
class ServerHostSlotQueryCard extends RadiantComponent {
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

describe('RadiantComponent', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders its view on connect', async () => {
		class GreetingCard extends RadiantComponent {
			override render() {
				return <p data-ref="message">Hello component</p>;
			}
		}

		customElements.define('greeting-card-test', GreetingCard);

		const element = document.createElement('greeting-card-test') as GreetingCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="message"]')?.textContent).toBe('Hello component');
		});
	});

	test('projects direct host children by default when render() is omitted', async () => {
		class PassthroughCard extends RadiantComponent {}

		customElements.define('passthrough-card-test', PassthroughCard);

		const element = document.createElement('passthrough-card-test') as PassthroughCard;
		const summary = document.createElement('p');
		summary.textContent = 'Projected summary';
		const action = document.createElement('button');
		action.type = 'button';
		action.textContent = 'Review';
		element.append(summary, action);
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.innerHTML).toContain('<p>Projected summary</p>');
			expect(element.innerHTML).toContain('<button type="button">Review</button>');
		});
	});

	test('update() rerenders the current view manually', async () => {
		class CountCard extends RadiantComponent {
			count = 0;

			override render() {
				return <p data-ref="count">{this.count}</p>;
			}
		}

		customElements.define('count-card-test', CountCard);

		const element = document.createElement('count-card-test') as CountCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('0');
		});

		element.count = 4;
		element.update();

		expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('4');
		expect(element.innerHTML).not.toContain('radiant-jsx-child-start');
		expect(element.innerHTML).not.toContain('radiant-jsx-child-end');
	});

	test('@onUpdated can trigger update() for reactive props', async () => {
		class ReactiveCountCard extends RadiantComponent {
			static observedAttributes = ['count'];
			declare count: number;

			constructor() {
				super();
				this.createReactiveProp('count', { type: Number, defaultValue: 1 });
			}

			@onUpdated('count')
			rerenderView() {
				this.update();
			}

			override render() {
				return <p data-ref="count">{this.count}</p>;
			}
		}

		customElements.define('reactive-count-card-test', ReactiveCountCard);

		const element = document.createElement('reactive-count-card-test') as ReactiveCountCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		});

		element.count = 8;

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('8');
		});
	});

	test('update() defers rendering until the element is connected', async () => {
		class DeferredCard extends RadiantComponent {
			message = 'Before connect';

			override render() {
				return <p data-ref="message">{this.message}</p>;
			}
		}

		customElements.define('deferred-card-test', DeferredCard);

		const element = document.createElement('deferred-card-test') as DeferredCard;
		element.message = 'Queued render';
		element.update();

		expect(element.innerHTML).toBe('');

		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="message"]')?.textContent).toBe('Queued render');
		});
	});

	test('rerenders when render() reads shared signals and stores directly', async () => {
		const sharedCount = createSignalState(1);
		const sharedStore = createStore({ status: 'idle' });

		class SharedSignalStoreCard extends RadiantComponent {
			override render() {
				return (
					<p data-ref="summary">
						{sharedCount.get()} / {sharedStore.status}
					</p>
				);
			}
		}

		customElements.define('shared-signal-store-card-test', SharedSignalStoreCard);

		const element = document.createElement('shared-signal-store-card-test') as SharedSignalStoreCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="summary"]')?.textContent).toBe('1 / idle');
		});

		sharedCount.set(3);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="summary"]')?.textContent).toBe('3 / idle');
		});

		sharedStore.status = 'ready';

		await waitFor(() => {
			expect(element.querySelector('[data-ref="summary"]')?.textContent).toBe('3 / ready');
		});
	});

	test('renderToString() serializes the current view without connecting', () => {
		class ServerGreetingCard extends RadiantComponent {
			message = 'Hello SSR';

			override render() {
				return <p data-ref="message">{this.message}</p>;
			}
		}

		customElements.define('server-greeting-card-test', ServerGreetingCard);

		const element = document.createElement('server-greeting-card-test') as ServerGreetingCard;

		expect(element.renderToString()).toBe('<p data-ref="message">Hello SSR</p>');
	});

	test('renderToString() serializes projected default-slot content when render() is omitted', () => {
		class ServerPassthroughCard extends RadiantComponent {}

		customElements.define('server-passthrough-card-test', ServerPassthroughCard);

		const element = document.createElement('server-passthrough-card-test') as ServerPassthroughCard;
		element.innerHTML = '<p>Projected body</p><button type="button">Open</button>';

		expect(element.renderToString()).toBe('<p>Projected body</p><button type="button">Open</button>');
	});

	test('projects default and named slot content in client rendering', async () => {
		class SlotCard extends RadiantComponent {
			override render() {
				return (
					<section>
						<header>
							<slot name="header">
								<h2>Fallback heading</h2>
							</slot>
						</header>
						<div data-ref="body">
							<slot>
								<p>Fallback body</p>
							</slot>
						</div>
					</section>
				);
			}
		}

		customElements.define('slot-card-test', SlotCard);

		const element = document.createElement('slot-card-test') as SlotCard;
		const heading = document.createElement('h1');
		heading.setAttribute('slot', 'header');
		heading.textContent = 'Projected heading';
		const body = document.createElement('p');
		body.textContent = 'Projected body';
		element.append(heading, body);
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('header > h1')?.textContent).toBe('Projected heading');
			expect(element.querySelector('[data-ref="body"] > p')?.textContent).toBe('Projected body');
		});
	});

	test('falls back when a slot has no projected content', async () => {
		class FallbackSlotCard extends RadiantComponent {
			override render() {
				return (
					<section>
						<header>
							<slot name="header">
								<h2 data-ref="fallback">Fallback heading</h2>
							</slot>
						</header>
					</section>
				);
			}
		}

		customElements.define('fallback-slot-card-test', FallbackSlotCard);

		const element = document.createElement('fallback-slot-card-test') as FallbackSlotCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="fallback"]')?.textContent).toBe('Fallback heading');
		});
	});

	test('reprojects direct host child mutations after connect', async () => {
		class DynamicSlotCard extends RadiantComponent {
			override render() {
				return (
					<section>
						<header data-ref="header">
							<slot name="header" />
						</header>
					</section>
				);
			}
		}

		customElements.define('dynamic-slot-card-test', DynamicSlotCard);

		const element = document.createElement('dynamic-slot-card-test') as DynamicSlotCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="header"]')?.children).toHaveLength(0);
		});

		const heading = document.createElement('h2');
		heading.setAttribute('slot', 'header');
		heading.textContent = 'Late heading';
		element.appendChild(heading);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="header"] > h2')?.textContent).toBe('Late heading');
		});
	});

	test('renderHostToString() serializes the host tag and reactive attributes', () => {
		installLightDomShim();

		@customElement('server-host-card-test')
		class ServerHostCard extends RadiantComponent {
			@reactiveProp({ type: Number, reflect: true, defaultValue: 3 }) count!: number;
			@reactiveProp({ type: String, defaultValue: 'Host SSR' }) label!: string;

			override render() {
				return <p data-ref="message">{this.label}</p>;
			}
		}

		const element = new ServerHostCard();
		element.count = 7;
		element.label = 'Host ready';

		expect(element.renderHostToString()).toBe(
			'<server-host-card-test count="7" label="Host ready"><p data-ref="message">Host ready</p></server-host-card-test>',
		);
	});

	test('renderToString() serializes nested registered Radiant consumers with finalized SSR context state', () => {
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			Symbol.for('@ecopages/jsx.force-server-custom-element-render')
		];

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			Symbol.for('@ecopages/jsx.force-server-custom-element-render')
		] = true;

		try {
			const html = renderToString(<nested-ssr-board-card-test />, { hydrate: true });

			expect(html).toContain('<nested-ssr-board-card-test>');
			expect(html).toContain('<nested-ssr-summary-card-test>');
			expect(html).toContain('Design systems is steering build with 3 commits.');
			expect(html).toContain('<nested-ssr-insight-card-test>');
			expect(html).toContain('Stage: Build / Calm / 3');
			expect(html).not.toContain('Awaiting board context');
			expect(html).not.toContain('Stage: Pending');
		} finally {
			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					Symbol.for('@ecopages/jsx.force-server-custom-element-render')
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					Symbol.for('@ecopages/jsx.force-server-custom-element-render')
				] = previousForceServerCustomElementRender;
			}
		}
	});

	test('renderToString() applies array @prop values before the first server render of a JSX custom element', () => {
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			Symbol.for('@ecopages/jsx.force-server-custom-element-render')
		];

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			Symbol.for('@ecopages/jsx.force-server-custom-element-render')
		] = true;

		try {
			const html = renderToString(<ssr-array-prop-card-test items={[{ label: 'first' }, { label: 'second' }]} />);

			expect(html).toContain(
				'<ssr-array-prop-card-test items="[{&quot;label&quot;:&quot;first&quot;},{&quot;label&quot;:&quot;second&quot;}]">',
			);
			expect(html).toContain('<p>first, second</p>');
			expect(html).not.toContain('[object Object]');
		} finally {
			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					Symbol.for('@ecopages/jsx.force-server-custom-element-render')
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					Symbol.for('@ecopages/jsx.force-server-custom-element-render')
				] = previousForceServerCustomElementRender;
			}
		}
	});

	test('explicit SSR setup remains a safe no-op when a DOM is already available', () => {
		const initialRegistry = globalThis.customElements;
		const initialHTMLElement = globalThis.HTMLElement;
		const runtime = installLightDomShim();

		expect(runtime.customElements).toBe(initialRegistry);
		expect(runtime.HTMLElement).toBe(initialHTMLElement);
	});

	test('renderHostToString({ hydrate: true }) keeps hydration output free of internal child markers', () => {
		@customElement('server-host-hydrate-card-test')
		class ServerHostHydrateCard extends RadiantComponent {
			@reactiveProp({ type: Number, reflect: true, defaultValue: 3 }) count!: number;
			@reactiveProp({ type: String, defaultValue: 'SSR counter rendered in Nitro' }) label!: string;

			override render() {
				return (
					<section class="component-card component-card--counter">
						<p class="component-tag">RadiantComponent</p>
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

		const html = element.renderHostToString({ hydrate: true });

		expect(html).toContain('<server-host-hydrate-card-test count="28" label="SSR counter rendered in Nitro">');
		expect(html).toContain('class="component-tag">RadiantComponent</p>');
		expect(html).toContain('<h3>SSR counter rendered in Nitro</h3>');
		expect(html).toContain('class="component-metric">Count: 28</p>');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test('renderHostToString({ hydrate: true }) serializes bound JSX child values', () => {
		type ServerHostBoundHydrateCardBindings = {
			count: number;
			label: string;
		};

		@customElement('server-host-bound-hydrate-card-test')
		class ServerHostBoundHydrateCard extends RadiantComponent<ServerHostBoundHydrateCardBindings> {
			@reactiveProp({ type: Number, reflect: true, defaultValue: 3, bind: true }) count!: number;
			@reactiveProp({ type: String, defaultValue: 'SSR counter rendered in Nitro' }) label!: string;

			override render() {
				return (
					<section class="component-card component-card--counter">
						<p class="component-tag">RadiantComponent</p>
						<h3>{this.label}</h3>
						<p class="component-metric">Count: {this.bind('count')}</p>
					</section>
				);
			}
		}

		const element = new ServerHostBoundHydrateCard();
		element.count = 28;
		element.label = 'SSR counter rendered in Nitro';

		const html = element.renderHostToString({ hydrate: true });

		expect(html).toContain(
			'<server-host-bound-hydrate-card-test count="28" label="SSR counter rendered in Nitro">',
		);
		expect(html).toContain('<h3>SSR counter rendered in Nitro</h3>');
		expect(html).toContain('class="component-metric">Count: 28</p>');
		expect(html).not.toContain('[object Object]');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test('renderHostToString({ hydrate: true }) serializes very nested component trees', () => {
		type ServerHostDeepTreeBindings = {
			count: number;
			label: string;
		};

		@customElement('server-host-deep-tree-test')
		class ServerHostDeepTree extends RadiantComponent<ServerHostDeepTreeBindings> {
			@reactiveProp({ type: String, defaultValue: 'Deep SSR' }) label!: string;
			@reactiveProp({ type: Number, reflect: true, defaultValue: 11, bind: true }) count!: number;

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
		const html = element.renderHostToString({ hydrate: true });

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

	test('renderHostToString() keeps subclass host attribute overrides', () => {
		@customElement('server-host-override-card-test')
		class ServerHostOverrideCard extends RadiantComponent {
			override render() {
				return <p>Override</p>;
			}

			protected override getHostSsrAttributes(): Record<string, string> {
				return {
					role: 'status',
					'aria-live': 'polite',
				};
			}
		}

		const element = new ServerHostOverrideCard();

		expect(element.renderHostToString()).toBe(
			'<server-host-override-card-test role="status" aria-live="polite"><p>Override</p></server-host-override-card-test>',
		);
	});

	test('renderHostToString() serializes projected slot content and embeds slot projection payload', () => {
		@customElement('server-host-slot-card-test')
		class ServerHostSlotCard extends RadiantComponent {
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

		const html = element.renderHostToString({ hydrate: true });

		expect(html).toContain('<header><h2 slot="header">Server heading</h2></header>');
		expect(html).toContain('<div><p>Server body</p></div>');
		expect(html).toContain('data-radiant-slot-projection');
	});

	test('createServerRenderEnvironment() prepares authored content for server-side slot queries', () => {
		const environment = createServerRenderEnvironment();

		const element = new ServerHostSlotQueryCard();
		environment.prepareHost(element, {
			authoredContent: '<h2 slot="header">Prepared heading</h2><p>Prepared body</p>',
		});

		expect(element.renderHostToString({ hydrate: true })).toContain('data-header-slot="Prepared heading"');
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

		test('hydrates array @prop values from SSR host attributes before the first client render', async () => {
			const serverElement = new SsrArrayPropCard();
			serverElement.items = [{ label: 'first' }, { label: 'second' }];
			const serverMarkup = serverElement.renderHostToString({ hydrate: true });

			document.body.innerHTML = serverMarkup;

			const element = document.querySelector('ssr-array-prop-card-test') as SsrArrayPropCard;

			await waitFor(() => {
				expect(element.items).toEqual([{ label: 'first' }, { label: 'second' }]);
				expect(element.querySelector('p')?.textContent).toBe('first, second');
			});
		});

		test('renderHostToString({ hydrate: true }) appends signal hydration scripts automatically', () => {
			class ServerHostSignalCard extends RadiantComponent {
				@signal({ hydrate: String, initial: 'idle' }) status!: WritableSignal<string>;

				override render() {
					return <p>{this.status}</p>;
				}
			}

			if (!customElements.get('server-host-signal-card-test')) {
				customElements.define('server-host-signal-card-test', ServerHostSignalCard);
			}
			setCustomElementTagName(ServerHostSignalCard, 'server-host-signal-card-test');

			const element = new ServerHostSignalCard();
			element.status.set('ready');
			const html = element.renderHostToString({ hydrate: true });

			expect(html).toContain('<server-host-signal-card-test>');
			expect(html).toContain('<p>ready</p>');
			expect(html).toContain(
				'<script type="application/json" data-hydration data-hydration-type="signal" data-hydration-key="status">"ready"</script>',
			);
		});
	});

	test('renderHostToString({ hydrate: true }) appends provider hydration scripts automatically', () => {
		const serverContext = createContext<{ label: string; level: number }>(Symbol('server-context-card'));

		class ServerHostContextCard extends RadiantComponent {
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

		if (!customElements.get('server-host-context-card-test')) {
			customElements.define('server-host-context-card-test', ServerHostContextCard);
		}
		setCustomElementTagName(ServerHostContextCard, 'server-host-context-card-test');

		const element = new ServerHostContextCard();
		const html = element.renderHostToString({ hydrate: true });

		expect(html).toContain('<server-host-context-card-test>');
		expect(html).toContain('<p>Provider host</p>');
		expect(html).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(html).toContain('{"label":"SSR context","level":4}');
	});

	test('hydrates SSR markup in place on connect', async () => {
		class HydratedCounter extends RadiantComponent {
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

		const serverElement = document.createElement('hydrated-counter-test') as HydratedCounter;
		const serverMarkup = serverElement.renderToString({ hydrate: true });

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
		class HydratedSlotCard extends RadiantComponent {
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
		const serverMarkup = serverElement.renderHostToString({ hydrate: true });

		document.body.innerHTML = serverMarkup;

		const element = document.querySelector('hydrated-slot-card-test') as HydratedSlotCard;

		await waitFor(() => {
			expect(element.querySelector('header > h2')?.textContent).toBe('SSR header');
			expect(element.querySelector('div > p')?.textContent).toBe('SSR body');
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => {
			expect(element.querySelector('button')?.textContent).toBe('Count 1');
		});
	});

	test('hydrates slot projection payloads with multiple projected roots and quoted attributes', async () => {
		@customElement('hydrated-complex-slot-card-test')
		class HydratedComplexSlotCard extends RadiantComponent {
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
		const serverMarkup = serverElement.renderHostToString({ hydrate: true });

		document.body.innerHTML = serverMarkup;

		const element = document.querySelector('hydrated-complex-slot-card-test') as HydratedComplexSlotCard;

		await waitFor(() => {
			expect(element.querySelector('header > h2')?.getAttribute('data-note')).toBe('1 > 0');
			expect(element.querySelector('[data-ref="body"] > article > p')?.textContent).toBe('SSR body');
			expect(element.querySelector('[data-ref="body"] > radiant-component-counter')?.getAttribute('count')).toBe(
				'4',
			);
			expect(element.querySelector('footer > p')?.textContent).toBe('SSR footer');
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => {
			expect(element.querySelector('button')?.textContent).toBe('Count 1');
		});
	});

	test('first-connect hydration ignores stale pre-connect update requests', async () => {
		class DeferredHydratedCard extends RadiantComponent {
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

		const serverElement = document.createElement('deferred-hydrated-card-test') as DeferredHydratedCard;
		const serverMarkup = serverElement.renderToString({ hydrate: true });

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

	test('bindReactiveValue updates the subscribed child without rerendering the component', async () => {
		type BoundReactiveCounterBindings = {
			count: number;
		};

		class BoundReactiveCounter extends RadiantComponent<BoundReactiveCounterBindings> {
			static observedAttributes = ['count', 'label'];
			declare count: number;
			declare label: string;
			renderCount = 0;

			constructor() {
				super();
				this.createReactiveProp('count', { type: Number, defaultValue: 1, bind: true });
				this.createReactiveProp('label', { type: String, defaultValue: 'Count' });
			}

			@onUpdated('label')
			rerenderView() {
				this.update();
			}

			override render() {
				this.renderCount += 1;

				return (
					<p data-ref="count">
						{this.label}: {this.bind('count')}
					</p>
				);
			}
		}

		customElements.define('bound-reactive-counter-test', BoundReactiveCounter);

		const element = document.createElement('bound-reactive-counter-test') as BoundReactiveCounter;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Count: 1');
		});

		const initialRenderCount = element.renderCount;
		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});

		observer.observe(element, {
			characterData: true,
			characterDataOldValue: true,
			childList: true,
			subtree: true,
		});

		element.count = 2;

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Count: 2');
		});

		observer.disconnect();

		expect(element.renderCount).toBe(initialRenderCount);
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('1');

		element.label = 'Clicks';

		await waitFor(() => {
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Clicks: 2');
		});

		expect(element.renderCount).toBe(initialRenderCount + 1);
	});

	test('@reactiveProp({ bind: true }) exposes a stable companion binding accessor', () => {
		type BoundPropBindings = {
			count: number;
		};

		class BoundPropElement extends RadiantComponent<BoundPropBindings> {
			declare count: number;

			constructor() {
				super();
				this.createReactiveProp('count', { type: Number, defaultValue: 1, bind: true });
			}
		}

		customElements.define('bound-prop-element-test', BoundPropElement);

		const element = document.createElement('bound-prop-element-test') as BoundPropElement;
		const firstBinding = element.bind('count');
		const secondBinding = element.bind('count');
		const namespaceBinding = element.bindings.count;
		const shortNamespaceBinding = element.$.count;

		expect(firstBinding).toBe(secondBinding);
		expect(firstBinding).toBe(namespaceBinding);
		expect(namespaceBinding).toBe(shortNamespaceBinding);
		expect(firstBinding.getValue()).toBe(1);

		element.count = 4;
		expect(element.bindings.count.getValue()).toBe(4);
	});

	test('createReactiveProp and createReactiveField auto-bind on RadiantComponent when bind is omitted', () => {
		class AutoBoundMembersElement extends RadiantComponent {
			declare count: number;
			declare draft: string;

			constructor() {
				super();
				this.createReactiveProp('count', { type: Number, defaultValue: 1 });
				this.createReactiveField('draft', 'ready');
			}
		}

		customElements.define('auto-bound-members-element-test', AutoBoundMembersElement);

		const element = document.createElement('auto-bound-members-element-test') as AutoBoundMembersElement & {
			$count: ReturnType<AutoBoundMembersElement['bind']>;
			$draft: ReturnType<AutoBoundMembersElement['bind']>;
		};

		expect(element.$count.getValue()).toBe(1);
		expect(element.$draft.getValue()).toBe('ready');
	});

	test('tracks plain @prop and @state reads during render without manual rerender wiring', async () => {
		const element = document.createElement('tracked-reactive-reads-card-test') as TrackedReactiveReadsCard;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.textContent).toBe('Count: 1');
			expect(element.querySelector('button')?.getAttribute('data-active')).toBe('yes');
			expect(element.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
		});

		const initialRenderCount = element.renderCount;
		element.count = 2;

		await waitFor(() => {
			expect(element.textContent).toBe('Count: 2');
			expect(element.querySelector('button')?.getAttribute('data-active')).toBe('no');
			expect(element.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
		});

		expect(element.renderCount).toBe(initialRenderCount + 1);

		element.label = 'Clicks';

		await waitFor(() => {
			expect(element.textContent).toBe('Clicks: 2');
		});

		expect(element.renderCount).toBe(initialRenderCount + 2);
	});
});
