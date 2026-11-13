import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	ContextProvider,
	consumeContext,
	contextSelector,
	createContext,
	onContextUpdate,
	provideContext,
} from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';

type Shared = { value: number };
type SharedContext = ReturnType<typeof createContext<Shared>>;
type ProtocolCallback = (value: unknown, unsubscribe?: () => void) => void;

let counter = 0;
const nextTag = (kind: string) => `context-protocol-${kind}-${++counter}`;

/**
 * Builds a `context-request` the way a third-party consumer would: a plain `Event` with the protocol fields,
 * not Radiant's `ContextRequestEvent` class.
 */
function protocolRequest(context: unknown, callback: ProtocolCallback, subscribe?: boolean): Event {
	return Object.assign(new Event('context-request', { bubbles: true, composed: true }), {
		context,
		callback,
		subscribe,
	});
}

function defineRadiantProvider(context: SharedContext, initialValue?: Shared) {
	const tag = nextTag('radiant-provider');
	class Provider extends RadiantElement {
		@provideContext<typeof context>({ context, initialValue })
		shared!: ContextProvider<typeof context>;
	}
	customElements.define(tag, Provider);
	return { tag, Provider };
}

/** A consumer that knows only the protocol: subscribes on connect and unsubscribes on disconnect. */
function defineProtocolConsumer(context: unknown, received: unknown[]) {
	const tag = nextTag('protocol-consumer');
	class ProtocolConsumer extends HTMLElement {
		unsubscribe?: () => void;

		connectedCallback() {
			this.dispatchEvent(
				protocolRequest(
					context,
					(value, unsubscribe) => {
						received.push(value);
						this.unsubscribe = unsubscribe;
					},
					true,
				),
			);
		}

		disconnectedCallback() {
			this.unsubscribe?.();
			this.unsubscribe = undefined;
		}
	}
	customElements.define(tag, ProtocolConsumer);
	return tag;
}

/** A provider that knows only the protocol: a plain element listening for `context-request`. */
function defineProtocolProvider(context: unknown) {
	const tag = nextTag('protocol-provider');
	class ProtocolProvider extends HTMLElement {
		value: unknown = { value: 1 };
		subscribers = new Set<ProtocolCallback>();

		constructor() {
			super();
			this.addEventListener('context-request', (event) => {
				const request = event as Event & { context: unknown; callback: ProtocolCallback; subscribe?: boolean };
				if (request.context !== context) return;
				event.stopImmediatePropagation();

				if (!request.subscribe) {
					request.callback(this.value);
					return;
				}

				this.subscribers.add(request.callback);
				request.callback(this.value, () => this.subscribers.delete(request.callback));
			});
		}

		setValue(value: unknown) {
			this.value = value;
			for (const callback of this.subscribers) {
				callback(value, () => this.subscribers.delete(callback));
			}
		}
	}
	customElements.define(tag, ProtocolProvider);
	return { tag, ProtocolProvider };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('a Radiant provider answering a protocol context-request', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('passes the value, not the provider, to a request that does not subscribe, and keeps no callback', () => {
		const context = createContext<Shared>(Symbol('once'));
		const { tag, Provider } = defineRadiantProvider(context, { value: 1 });
		const provider = document.createElement(tag) as InstanceType<typeof Provider>;
		const child = document.createElement('div');
		provider.appendChild(child);
		document.body.appendChild(provider);
		const callback = vi.fn();

		child.dispatchEvent(protocolRequest(context, callback));

		expect(callback).toHaveBeenCalledOnce();
		expect(callback.mock.calls[0]).toEqual([{ value: 1 }]);
		expect(provider.shared.subscriptions).toHaveLength(0);
		provider.shared.setContext({ value: 2 });
		expect(callback).toHaveBeenCalledOnce();
	});

	test('stops immediate propagation before it calls the callback', () => {
		const context = createContext<Shared>(Symbol('stop'));
		const { tag } = defineRadiantProvider(context, { value: 1 });
		const outer = document.createElement('section');
		const provider = document.createElement(tag);
		const child = document.createElement('div');
		provider.appendChild(child);
		outer.appendChild(provider);
		document.body.appendChild(outer);
		const sameHostListener = vi.fn();
		const outerListener = vi.fn();
		provider.addEventListener('context-request', sameHostListener);
		outer.addEventListener('context-request', outerListener);
		let stoppedBeforeCallback: boolean | undefined;
		const request = protocolRequest(context, () => {
			stoppedBeforeCallback = request.cancelBubble;
		});

		child.dispatchEvent(request);

		expect(stoppedBeforeCallback).toBe(true);
		expect(sameHostListener).not.toHaveBeenCalled();
		expect(outerListener).not.toHaveBeenCalled();
	});

	test('gives a spec-only consumer the value and every update until it unsubscribes on disconnect', () => {
		const context = createContext<Shared>(Symbol('subscribe'));
		const { tag, Provider } = defineRadiantProvider(context, { value: 1 });
		const received: unknown[] = [];
		const consumerTag = defineProtocolConsumer(context, received);
		const provider = document.createElement(tag) as InstanceType<typeof Provider>;
		const consumer = document.createElement(consumerTag);
		provider.appendChild(consumer);
		document.body.appendChild(provider);

		expect(received).toEqual([{ value: 1 }]);
		expect(provider.shared.subscriptions).toHaveLength(1);

		provider.shared.setContext({ value: 2 });
		expect(received).toEqual([{ value: 1 }, { value: 2 }]);

		consumer.remove();
		expect(provider.shared.subscriptions).toHaveLength(0);
		provider.shared.setContext({ value: 3 });
		expect(received).toEqual([{ value: 1 }, { value: 2 }]);
	});

	test('passes the same unsubscribe on the first answer and on every update', () => {
		const context = createContext<Shared>(Symbol('same-unsubscribe'));
		const { tag, Provider } = defineRadiantProvider(context, { value: 1 });
		const provider = document.createElement(tag) as InstanceType<typeof Provider>;
		document.body.appendChild(provider);
		const callback = vi.fn();

		provider.dispatchEvent(protocolRequest(context, callback, true));
		provider.shared.setContext({ value: 2 });

		const [first, second] = callback.mock.calls;
		expect(first[1]).toEqual(expect.any(Function));
		expect(second[1]).toBe(first[1]);
	});

	test('answers with undefined while it has no value, then delivers the first value to subscribers', () => {
		const context = createContext<Shared>(Symbol('no-value'));
		const { tag, Provider } = defineRadiantProvider(context);
		const provider = document.createElement(tag) as InstanceType<typeof Provider>;
		document.body.appendChild(provider);
		const once = vi.fn();
		const subscriber = vi.fn();

		provider.dispatchEvent(protocolRequest(context, once));
		provider.dispatchEvent(protocolRequest(context, subscriber, true));

		expect(once.mock.calls).toEqual([[undefined]]);
		expect(subscriber.mock.calls).toEqual([[undefined, expect.any(Function)]]);

		provider.shared.setContext({ value: 4 });

		expect(once).toHaveBeenCalledOnce();
		expect(subscriber).toHaveBeenLastCalledWith({ value: 4 }, subscriber.mock.calls[0][1]);
	});
});

describe('a spec-only provider answering Radiant consumers', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('@contextSelector and @onContextUpdate receive the value and updates, and unsubscribe on disconnect', async () => {
		const context = createContext<Shared>(Symbol('foreign-provider'));
		const { tag: providerTag, ProtocolProvider } = defineProtocolProvider(context);
		const consumerTag = nextTag('radiant-consumer');
		const log: number[] = [];
		class Consumer extends RadiantElement {
			@contextSelector({ context, select: (shared) => shared.value })
			selected?: number;

			@onContextUpdate({ context })
			onShared(shared: Shared) {
				log.push(shared.value);
			}
		}
		customElements.define(consumerTag, Consumer);
		const provider = document.createElement(providerTag) as InstanceType<typeof ProtocolProvider>;
		const consumer = document.createElement(consumerTag) as Consumer;
		provider.appendChild(consumer);
		document.body.appendChild(provider);
		await flush();

		expect(consumer.selected).toBe(1);
		expect(log).toEqual([1]);
		expect(provider.subscribers.size).toBe(2);

		provider.setValue({ value: 2 });
		expect(consumer.selected).toBe(2);
		expect(log).toEqual([1, 2]);

		consumer.remove();
		expect(provider.subscribers.size).toBe(0);
	});

	test('@onContextUpdate waits for the first value when a spec-only provider answers with undefined', async () => {
		const context = createContext<Shared>(Symbol('foreign-empty'));
		const { tag: providerTag, ProtocolProvider } = defineProtocolProvider(context);
		const consumerTag = nextTag('radiant-waiting');
		const log: Shared[] = [];
		class Consumer extends RadiantElement {
			@onContextUpdate({ context })
			onShared(shared: Shared) {
				log.push(shared);
			}
		}
		customElements.define(consumerTag, Consumer);
		const provider = document.createElement(providerTag) as InstanceType<typeof ProtocolProvider>;
		provider.value = undefined;
		provider.appendChild(document.createElement(consumerTag));
		document.body.appendChild(provider);
		await flush();

		expect(log).toEqual([]);
		expect(provider.subscribers.size).toBe(1);

		provider.setValue({ value: 3 });
		expect(log).toEqual([{ value: 3 }]);
	});

	test('@consumeContext is not answered, because it needs a Radiant provider instance', async () => {
		const context = createContext<Shared>(Symbol('foreign-consume'));
		const { tag: providerTag } = defineProtocolProvider(context);
		const consumerTag = nextTag('radiant-consume');
		class Consumer extends RadiantElement {
			@consumeContext(context) provider?: ContextProvider<typeof context>;
		}
		customElements.define(consumerTag, Consumer);
		const provider = document.createElement(providerTag);
		const consumer = document.createElement(consumerTag) as Consumer;
		provider.appendChild(consumer);
		document.body.appendChild(provider);
		await flush();

		expect(consumer.provider).toBeUndefined();
	});
});
