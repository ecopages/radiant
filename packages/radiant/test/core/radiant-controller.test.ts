import { jsx, jsxs } from '@ecopages/jsx';
import type { WritableSignal } from '@ecopages/signals';
import { waitFor } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { onContextUpdate } from '../../src/context/decorators/on-context-update';
import { provideContext } from '../../src/context/decorators/provide-context';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { onEvent } from '../../src/decorators/on-event';
import { onUpdated } from '../../src/decorators/on-updated';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

const controllerContext = createContext<{ count: number }>(Symbol('controller-context'));
const controllerStatusContext = createContext<{ label: string }>(Symbol('controller-status-context'));

class CounterController extends RadiantController<{ count: number; status: string }> {
	@state count = 1;
	@signal({ initial: 'idle' }) status!: WritableSignal<string>;
}

class RenderController extends RadiantController<{ count: number; status: string }> {
	@state count = 1;
	@signal({ initial: 'idle' }) status!: WritableSignal<string>;

	override render() {
		return jsxs('section', {
			children: [
				jsx('span', { 'data-ref': 'count', children: String(this.count) }),
				jsx('span', { 'data-ref': 'status', children: this.status.get() }),
			],
		});
	}
}

class OnUpdatedController extends RadiantController<{ count: number }> {
	@state count = 0;

	@onUpdated('count')
	syncCountAttribute() {
		this.host.setAttribute('data-count', String(this.count));
	}
}

class ClickController extends RadiantController<{ count: number }> {
	@state count = 0;

	override render() {
		return jsx('button', { 'data-ref': 'toggle', children: String(this.count) });
	}

	@onEvent({ ref: 'toggle', type: 'click' })
	increment() {
		this.count += 1;
	}
}

class ContextProviderController extends RadiantController {
	@provideContext<typeof controllerContext>({
		context: controllerContext,
		initialValue: { count: 1 },
	})
	context!: ContextProvider<typeof controllerContext>;
}

class NestedContextProviderController extends RadiantController {
	@provideContext<typeof controllerContext>({
		context: controllerContext,
		initialValue: { count: 2 },
	})
	context!: ContextProvider<typeof controllerContext>;
}

class MultiContextProviderController extends RadiantController {
	@provideContext<typeof controllerContext>({
		context: controllerContext,
		initialValue: { count: 1 },
	})
	countContext!: ContextProvider<typeof controllerContext>;

	@provideContext<typeof controllerStatusContext>({
		context: controllerStatusContext,
		initialValue: { label: 'idle' },
	})
	statusContext!: ContextProvider<typeof controllerStatusContext>;
}

class ContextConsumerController extends RadiantController<{ count: number }> {
	@consumeContext(controllerContext) context!: ContextProvider<typeof controllerContext>;
	@contextSelector({ context: controllerContext, select: (context) => context.count }) count = 0;

	override render() {
		return jsx('span', { 'data-ref': 'count', children: String(this.count) });
	}
}

class ContextEffectController extends RadiantController {
	@consumeContext(controllerContext) context!: ContextProvider<typeof controllerContext>;

	@onContextUpdate({ context: controllerContext, select: (context) => context.count })
	onCountChanged(value: number) {
		this.host.setAttribute('data-count', String(value));
	}
}

class MultiContextConsumerController extends RadiantController<{ count: number; label: string }> {
	@contextSelector({ context: controllerContext, select: (context) => context.count }) count = 0;
	@contextSelector({ context: controllerStatusContext, select: (context) => context.label }) label = '';

	override render() {
		return jsxs('div', {
			children: [
				jsx('span', { 'data-ref': 'count', children: String(this.count) }),
				jsx('span', { 'data-ref': 'label', children: this.label }),
			],
		});
	}
}

class ContextProviderElement extends RadiantElement {
	@provideContext<typeof controllerContext>({
		context: controllerContext,
		initialValue: { count: 1 },
	})
	context!: ContextProvider<typeof controllerContext>;
}

if (!customElements.get('controller-context-provider-element')) {
	customElements.define('controller-context-provider-element', ContextProviderElement);
}

class ContextConsumerElement extends RadiantElement {
	@consumeContext(controllerContext) context!: ContextProvider<typeof controllerContext>;
	@contextSelector({ context: controllerContext, select: (context) => context.count }) count = 0;

	override render() {
		return this.count.toString();
	}
}

if (!customElements.get('controller-context-consumer-element')) {
	customElements.define('controller-context-consumer-element', ContextConsumerElement);
}

class ShadowBoundaryHost extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}
}

if (!customElements.get('controller-shadow-boundary')) {
	customElements.define('controller-shadow-boundary', ShadowBoundaryHost);
}

describeWhenStandard('RadiantController', () => {
	test('supports shared reactive field bindings', () => {
		const controller = new CounterController(document.createElement('div'));

		expect(controller.count).toBe(1);
		expect(controller.bind('count').getValue()).toBe(1);

		controller.count = 2;

		expect(controller.bindings.count.getValue()).toBe(2);
	});

	test('runs registered lifecycle callbacks on connect and disconnect', () => {
		const host = document.createElement('div');
		const controller = new CounterController(host);
		let connectedCount = 0;
		let cleanupCount = 0;

		controller.registerConnectedCallback(() => {
			connectedCount += 1;
		});
		controller.registerCleanupCallback(() => {
			cleanupCount += 1;
		});

		controller.connect();
		controller.disconnect();

		expect(connectedCount).toBe(1);
		expect(cleanupCount).toBe(1);
	});

	test('supports shared signal decorators', () => {
		const controller = new CounterController(document.createElement('div'));

		controller.connect();
		expect(controller.status.get()).toBe('idle');

		controller.status.set('ready');

		expect(controller.bind('status').getValue()).toBe('ready');
	});

	test('renders and rerenders when reactive controller state changes', async () => {
		const host = document.createElement('div');
		const controller = new RenderController(host);

		controller.connect();

		expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		expect(host.querySelector('[data-ref="status"]')?.textContent).toBe('idle');

		controller.count = 2;
		controller.status.set('ready');

		await waitFor(() => {
			expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('2');
			expect(host.querySelector('[data-ref="status"]')?.textContent).toBe('ready');
		});
	});

	test('supports @onUpdated callbacks', () => {
		const host = document.createElement('div');
		const controller = new OnUpdatedController(host);

		controller.connect();
		controller.count = 3;

		expect(host.getAttribute('data-count')).toBe('3');
	});

	test('supports delegated @onEvent handlers on rendered controller content', async () => {
		const host = document.createElement('div');
		const controller = new ClickController(host);

		controller.connect();
		host.querySelector<HTMLButtonElement>('[data-ref="toggle"]')?.click();

		await waitFor(() => {
			expect(host.querySelector('[data-ref="toggle"]')?.textContent).toBe('1');
		});
	});

	test('supports provideContext, consumeContext, and contextSelector on controllers', async () => {
		const providerHost = document.createElement('div');
		const consumerHost = document.createElement('div');
		providerHost.appendChild(consumerHost);
		document.body.appendChild(providerHost);

		const provider = new ContextProviderController(providerHost);
		const consumer = new ContextConsumerController(consumerHost);

		provider.connect();
		consumer.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(1);
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		});

		provider.context.setContext({ count: 3 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('3');
		});
	});

	test('supports onContextUpdate on controllers', async () => {
		const providerHost = document.createElement('div');
		const consumerHost = document.createElement('div');
		providerHost.appendChild(consumerHost);
		document.body.appendChild(providerHost);

		const provider = new ContextProviderController(providerHost);
		const consumer = new ContextEffectController(consumerHost);

		provider.connect();
		consumer.connect();

		await waitFor(() => {
			expect(consumerHost.getAttribute('data-count')).toBe('1');
		});

		provider.context.setContext({ count: 4 });

		await waitFor(() => {
			expect(consumerHost.getAttribute('data-count')).toBe('4');
		});
	});

	test('supports multiple context selectors on a single controller', async () => {
		const providerHost = document.createElement('div');
		const consumerHost = document.createElement('div');
		providerHost.appendChild(consumerHost);
		document.body.appendChild(providerHost);

		const provider = new MultiContextProviderController(providerHost);
		const consumer = new MultiContextConsumerController(consumerHost);

		provider.connect();
		consumer.connect();

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');
			expect(consumerHost.querySelector('[data-ref="label"]')?.textContent).toBe('idle');
			expect(provider.countContext.subscriptions).toHaveLength(1);
			expect(provider.statusContext.subscriptions).toHaveLength(1);
		});

		provider.countContext.setContext({ count: 7 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('7');
			expect(consumerHost.querySelector('[data-ref="label"]')?.textContent).toBe('idle');
		});

		provider.statusContext.setContext({ label: 'ready' });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('7');
			expect(consumerHost.querySelector('[data-ref="label"]')?.textContent).toBe('ready');
		});
	});

	test('cleans up controller context subscriptions on disconnect and restores them on reconnect', async () => {
		const providerHost = document.createElement('div');
		const consumerHost = document.createElement('div');
		providerHost.appendChild(consumerHost);
		document.body.appendChild(providerHost);

		const provider = new ContextProviderController(providerHost);
		const consumer = new ContextEffectController(consumerHost);

		provider.connect();
		consumer.connect();

		await waitFor(() => {
			expect(consumerHost.getAttribute('data-count')).toBe('1');
			expect(provider.context.subscriptions).toHaveLength(1);
		});

		consumer.disconnect();

		expect(provider.context.subscriptions).toHaveLength(0);

		provider.context.setContext({ count: 4 });
		expect(consumerHost.getAttribute('data-count')).toBe('1');

		consumer.connect();

		await waitFor(() => {
			expect(provider.context.subscriptions).toHaveLength(1);
			expect(consumerHost.getAttribute('data-count')).toBe('4');
		});
	});

	test('resolves context from a RadiantController provider into a nested RadiantElement consumer', async () => {
		const providerHost = document.createElement('div');
		const consumer = document.createElement('controller-context-consumer-element') as ContextConsumerElement;
		providerHost.appendChild(consumer);
		document.body.appendChild(providerHost);

		const provider = new ContextProviderController(providerHost);
		provider.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(1);
			expect(consumer.textContent).toBe('1');
		});

		provider.context.setContext({ count: 5 });

		await waitFor(() => {
			expect(consumer.textContent).toBe('5');
		});
	});

	test('resolves context from a RadiantElement provider into a nested RadiantController consumer', async () => {
		const provider = document.createElement('controller-context-provider-element') as ContextProviderElement;
		const consumerHost = document.createElement('div');
		provider.appendChild(consumerHost);
		document.body.appendChild(provider);

		const consumer = new ContextConsumerController(consumerHost);
		consumer.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(1);
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		});

		provider.context.setContext({ count: 6 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('6');
		});
	});

	test('resolves controller context across a descendant shadow boundary into a RadiantController consumer', async () => {
		const providerHost = document.createElement('div');
		const shadowBoundary = document.createElement('controller-shadow-boundary') as ShadowBoundaryHost;
		const consumerHost = document.createElement('div');
		shadowBoundary.shadowRoot?.appendChild(consumerHost);
		providerHost.appendChild(shadowBoundary);
		document.body.appendChild(providerHost);

		const provider = new ContextProviderController(providerHost);
		const consumer = new ContextConsumerController(consumerHost);

		provider.connect();
		consumer.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(1);
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		});

		provider.context.setContext({ count: 10 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('10');
		});
	});

	test('resolves controller context across a descendant shadow boundary into a RadiantElement consumer', async () => {
		const providerHost = document.createElement('div');
		const shadowBoundary = document.createElement('controller-shadow-boundary') as ShadowBoundaryHost;
		const consumer = document.createElement('controller-context-consumer-element') as ContextConsumerElement;
		shadowBoundary.shadowRoot?.appendChild(consumer);
		providerHost.appendChild(shadowBoundary);
		document.body.appendChild(providerHost);

		const provider = new ContextProviderController(providerHost);
		provider.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(1);
			expect(consumer.textContent).toBe('1');
		});

		provider.context.setContext({ count: 11 });

		await waitFor(() => {
			expect(consumer.textContent).toBe('11');
		});
	});

	test('reconnects a RadiantController consumer to context updates after disconnect', async () => {
		const provider = document.createElement('controller-context-provider-element') as ContextProviderElement;
		const consumerHost = document.createElement('div');
		provider.appendChild(consumerHost);
		document.body.appendChild(provider);

		const consumer = new ContextConsumerController(consumerHost);
		consumer.connect();

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		});

		consumer.disconnect();
		provider.context.setContext({ count: 7 });

		expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');

		consumer.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(7);
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('7');
		});

		provider.context.setContext({ count: 8 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('8');
		});
	});

	test('resolves a controller consumer when its provider connects after the consumer', async () => {
		const providerHost = document.createElement('div');
		const consumerHost = document.createElement('div');
		providerHost.appendChild(consumerHost);
		document.body.appendChild(providerHost);

		const consumer = new ContextConsumerController(consumerHost);
		const provider = new ContextProviderController(providerHost);

		consumer.connect();
		provider.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(1);
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		});

		provider.context.setContext({ count: 9 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('9');
		});
	});

	test('prefers the nearest nested RadiantController provider for context resolution', async () => {
		const outerHost = document.createElement('div');
		const innerHost = document.createElement('div');
		const consumerHost = document.createElement('div');
		innerHost.appendChild(consumerHost);
		outerHost.appendChild(innerHost);
		document.body.appendChild(outerHost);

		const outerProvider = new ContextProviderController(outerHost);
		const innerProvider = new NestedContextProviderController(innerHost);
		const consumer = new ContextConsumerController(consumerHost);

		outerProvider.connect();
		innerProvider.connect();
		consumer.connect();

		await waitFor(() => {
			expect(consumer.context.getContext().count).toBe(2);
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('2');
		});

		outerProvider.context.setContext({ count: 11 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('2');
		});

		innerProvider.context.setContext({ count: 12 });

		await waitFor(() => {
			expect(consumerHost.querySelector('[data-ref="count"]')?.textContent).toBe('12');
		});
	});
});
