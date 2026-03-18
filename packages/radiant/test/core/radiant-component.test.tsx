/** @jsxImportSource @ecopages/jsx */
import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantComponent } from '../../src/core/radiant-component';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { reactiveProp } from '../../src/decorators/reactive-prop';

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
});
