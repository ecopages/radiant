/** @jsxImportSource @ecopages/jsx */
import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { setCustomElementTagName } from '../../src/core/custom-element-metadata';
import { RadiantComponent } from '../../src/core/radiant-component';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { reactiveProp } from '../../src/decorators/reactive-prop';
import { installLightDomShim } from '../../src/server/light-dom-shim';

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
		@customElement('server-host-bound-hydrate-card-test')
		class ServerHostBoundHydrateCard extends RadiantComponent {
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
		@customElement('server-host-deep-tree-test')
		class ServerHostDeepTree extends RadiantComponent {
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
		expect(html).toContain('<script type="application/json" data-hydration data-context-key="context">');
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
		class BoundReactiveCounter extends RadiantComponent {
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
		class BoundPropElement extends RadiantComponent {
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

		expect(firstBinding).toBe(secondBinding);
		expect(firstBinding.getValue()).toBe(1);

		element.count = 4;
		expect(element.bind('count').getValue()).toBe(4);
	});
});
