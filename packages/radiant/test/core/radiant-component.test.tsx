// @vitest-environment happy-dom
import { waitFor } from '@testing-library/dom';
import { jsx, jsxs, render as renderJsx } from '@ecopages/jsx';
import { createStore, state as createSignalState } from '@ecopages/signals';
import { beforeEach, describe, expect, test } from 'vitest';
import { uninstallRadiantHydrator } from '../../src/client/hydrator';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { state } from '../../src/decorators/state';
import { createCustomElement } from '../utils/create-custom-element';

@customElement('tracked-reactive-reads-card-test')
class TrackedReactiveReadsCard extends RadiantElement {
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

describe('RadiantElement', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		uninstallRadiantHydrator();
	});

	test('renders its view on connect', async () => {
		class GreetingCard extends RadiantElement {
			override render() {
				return <p data-ref="message">Hello component</p>;
			}
		}

		customElements.define('greeting-card-test', GreetingCard);

		const element = createCustomElement<GreetingCard>('greeting-card-test');
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="message"]')?.textContent).toBe('Hello component');
		});
	});

	test('renders into an internal shadow root when renderRootMode is shadow', async () => {
		class ShadowGreetingCard extends RadiantElement {
			protected override readonly renderRootMode = 'shadow';
			declare count: number;

			constructor() {
				super();
				this.createReactiveField('count', 0);
			}

			override connectedCallback(): void {
				super.connectedCallback();
				this.subscribeEvent({
					selector: '[data-ref="increment"]',
					type: 'click',
					listener: () => {
						this.count += 1;
					},
				});
			}

			override render() {
				return (
					<section>
						<p data-ref="message">Count: {this.count}</p>
						<button type="button" data-ref="increment">
							Increment
						</button>
					</section>
				);
			}
		}

		customElements.define('shadow-greeting-card-test', ShadowGreetingCard);

		const element = createCustomElement<ShadowGreetingCard>('shadow-greeting-card-test');
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.shadowRoot?.querySelector('[data-ref="message"]')?.textContent).toBe('Count: 0');
		});

		expect(element.getRef('message')?.textContent).toBe('Count: 0');
		expect(element.querySelector('[data-ref="message"]')).toBeNull();

		const incrementButton = element.getRef<HTMLButtonElement>('increment');
		incrementButton?.click();

		await waitFor(() => {
			expect(element.shadowRoot?.querySelector('[data-ref="message"]')?.textContent).toBe('Count: 1');
		});
	});

	test('projects direct host children by default when render() is omitted', async () => {
		class PassthroughCard extends RadiantElement {}

		customElements.define('passthrough-card-test', PassthroughCard);

		const element = createCustomElement<PassthroughCard>('passthrough-card-test');
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
		class CountCard extends RadiantElement {
			count = 0;

			override render() {
				return <p data-ref="count">{this.count}</p>;
			}
		}

		customElements.define('count-card-test', CountCard);

		const element = createCustomElement<CountCard>('count-card-test');
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
		class ReactiveCountCard extends RadiantElement {
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

		const element = createCustomElement<ReactiveCountCard>('reactive-count-card-test');
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
		class DeferredCard extends RadiantElement {
			message = 'Before connect';

			override render() {
				return <p data-ref="message">{this.message}</p>;
			}
		}

		customElements.define('deferred-card-test', DeferredCard);

		const element = createCustomElement<DeferredCard>('deferred-card-test');
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

		class SharedSignalStoreCard extends RadiantElement {
			override render() {
				return (
					<p data-ref="summary">
						{sharedCount.get()} / {sharedStore.status}
					</p>
				);
			}
		}

		customElements.define('shared-signal-store-card-test', SharedSignalStoreCard);

		const element = createCustomElement<SharedSignalStoreCard>('shared-signal-store-card-test');
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

	test('projects default and named slot content in client rendering', async () => {
		class SlotCard extends RadiantElement {
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

		const element = createCustomElement<SlotCard>('slot-card-test');
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
		class FallbackSlotCard extends RadiantElement {
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

		const element = createCustomElement<FallbackSlotCard>('fallback-slot-card-test');
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="fallback"]')?.textContent).toBe('Fallback heading');
		});
	});

	test('reprojects direct host child mutations after connect', async () => {
		class DynamicSlotCard extends RadiantElement {
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

		const element = createCustomElement<DynamicSlotCard>('dynamic-slot-card-test');
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

	test('client rendering in a RadiantElement host preserves camel-cased SVG markup', async () => {
		@customElement('client-svg-host-test')
		class ClientSvgHost extends RadiantElement {
			override render() {
				return (
					<div>
						<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
							<defs>
								<linearGradient id="gradient">
									<stop offset="0%" stop-color="#000" />
									<stop offset="100%" stop-color="#fff" />
								</linearGradient>
								<filter id="shadow">
									<feDropShadow dx="0" dy="2" stdDeviation="2" />
								</filter>
							</defs>
							<rect width="100" height="100" fill="url(#gradient)" filter="url(#shadow)" />
						</svg>
					</div>
				);
			}
		}

		const element = createCustomElement<ClientSvgHost>('client-svg-host-test');
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('linearGradient')).not.toBeNull();
			expect(element.querySelector('feDropShadow')).not.toBeNull();
		});

		const gradient = element.querySelector('linearGradient');
		const dropShadow = element.querySelector('feDropShadow');

		expect(gradient?.localName).toBe('linearGradient');
		expect(gradient?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(dropShadow?.localName).toBe('feDropShadow');
		expect(dropShadow?.namespaceURI).toBe('http://www.w3.org/2000/svg');

		expect(element.innerHTML).toContain('<linearGradient id="gradient">');
		expect(element.innerHTML).toContain('<feDropShadow dx="0" dy="2" stdDeviation="2"></feDropShadow>');
	});

	test('direct JSX render into a custom-element host preserves camel-cased SVG markup', () => {
		class PlainJsxSvgHost extends HTMLElement {}

		customElements.define('plain-jsx-svg-host-test', PlainJsxSvgHost);

		const host = createCustomElement<PlainJsxSvgHost>('plain-jsx-svg-host-test');

		renderJsx(
			jsx('div', {
				children: jsxs('svg', {
					viewBox: '0 0 100 100',
					xmlns: 'http://www.w3.org/2000/svg',
					children: [
						jsxs('defs', {
							children: [
								jsxs('linearGradient', {
									id: 'gradient',
									children: [
										jsx('stop', { offset: '0%', 'stop-color': '#000' }),
										jsx('stop', { offset: '100%', 'stop-color': '#fff' }),
									],
								}),
								jsx('filter', {
									id: 'shadow',
									children: jsx('feDropShadow', {
										dx: '0',
										dy: '2',
										stdDeviation: '2',
									}),
								}),
							],
						}),
						jsx('rect', {
							width: '100',
							height: '100',
							fill: 'url(#gradient)',
							filter: 'url(#shadow)',
						}),
					],
				}),
			}),
			host,
		);

		const gradient = host.querySelector('linearGradient');
		const dropShadow = host.querySelector('feDropShadow');

		expect(gradient?.localName).toBe('linearGradient');
		expect(dropShadow?.localName).toBe('feDropShadow');
		expect(host.innerHTML).toContain('<linearGradient id="gradient">');
		expect(host.innerHTML).toContain('<feDropShadow dx="0" dy="2" stdDeviation="2"></feDropShadow>');
	});

	test('bindReactiveValue updates the subscribed child without rerendering the component', async () => {
		type BoundReactiveCounterBindings = {
			count: number;
		};

		class BoundReactiveCounter extends RadiantElement<BoundReactiveCounterBindings> {
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

		const element = createCustomElement<BoundReactiveCounter>('bound-reactive-counter-test');
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

	test('@prop({ bind: true }) exposes a stable companion binding accessor', () => {
		type BoundPropBindings = {
			count: number;
		};

		class BoundPropElement extends RadiantElement<BoundPropBindings> {
			declare count: number;

			constructor() {
				super();
				this.createReactiveProp('count', { type: Number, defaultValue: 1, bind: true });
			}
		}

		customElements.define('bound-prop-element-test', BoundPropElement);

		const element = createCustomElement<BoundPropElement>('bound-prop-element-test');
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

	test('createReactiveProp and createReactiveField auto-bind on RadiantElement when bind is omitted', () => {
		class AutoBoundMembersElement extends RadiantElement {
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
		const element = createCustomElement<TrackedReactiveReadsCard>('tracked-reactive-reads-card-test');
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
