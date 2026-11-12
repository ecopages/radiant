import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	ContextProvider,
	consumeContext,
	createContext,
	onContextUpdate,
	provideContext,
} from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';

type Shared = { value: number };

let counter = 0;
const nextTag = (kind: string) => `late-provider-${kind}-${++counter}`;

function defineConsumer(tag: string, context: ReturnType<typeof createContext<Shared>>, log: number[]) {
	class Consumer extends RadiantElement {
		@consumeContext(context) provider?: ContextProvider<typeof context>;

		@onContextUpdate({ context, select: (shared) => shared.value })
		onValue(value: number) {
			log.push(value);
		}
	}
	customElements.define(tag, Consumer);
	return Consumer;
}

function defineProvider(tag: string, context: ReturnType<typeof createContext<Shared>>, initial = 1) {
	class Provider extends RadiantElement {
		@provideContext<typeof context>({ context, initialValue: { value: initial } })
		shared!: ContextProvider<typeof context>;
	}
	customElements.define(tag, Provider);
	return Provider;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('a provider defined after its consumer', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('answers a waiting consumer and keeps updating it', async () => {
		const context = createContext<Shared>(Symbol('late'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		const log: number[] = [];
		defineConsumer(consumerTag, context, log);
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;
		await flush();
		expect(log).toEqual([]);

		const Provider = defineProvider(providerTag, context, 5);
		await flush();

		expect(log).toEqual([5]);
		const provider = document.querySelector(providerTag) as InstanceType<typeof Provider>;
		provider.shared.setContext({ value: 6 });
		expect(log).toEqual([5, 6]);
	});

	test('waiting consumers get the value through a plain consumeContext field too', async () => {
		const context = createContext<Shared>(Symbol('late-plain'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		const Consumer = defineConsumer(consumerTag, context, []);
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;
		await flush();
		const consumer = document.querySelector(consumerTag) as InstanceType<typeof Consumer>;
		expect(consumer.provider).toBeFalsy();

		defineProvider(providerTag, context);
		await flush();

		expect(consumer.provider?.getContext().value).toBe(1);
	});

	test('does not answer a request for another context', async () => {
		const wanted = createContext<Shared>(Symbol('wanted'));
		const other = createContext<Shared>(Symbol('other'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		const log: number[] = [];
		defineConsumer(consumerTag, wanted, log);
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;

		defineProvider(providerTag, other);
		await flush();

		expect(log).toEqual([]);
	});

	test('does not call a consumer that left before the provider was defined', async () => {
		const context = createContext<Shared>(Symbol('left'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		const log: number[] = [];
		defineConsumer(consumerTag, context, log);
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;
		await flush();
		document.querySelector(consumerTag)?.remove();

		defineProvider(providerTag, context);
		await flush();

		expect(log).toEqual([]);
	});

	test('does not answer a consumer outside the provider', async () => {
		const context = createContext<Shared>(Symbol('outside'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		const log: number[] = [];
		defineConsumer(consumerTag, context, log);
		document.body.innerHTML = `<${providerTag}></${providerTag}><${consumerTag}></${consumerTag}>`;

		defineProvider(providerTag, context);
		await flush();

		expect(log).toEqual([]);
	});

	test('delivers once when the microtask retry answers before the provider announces itself', async () => {
		const context = createContext<Shared>(Symbol('once'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		defineConsumer(consumerTag, context, []);
		const mounted: Event[] = [];
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;
		document.querySelector(consumerTag)?.addEventListener('context-mounted', (event) => mounted.push(event));

		defineProvider(providerTag, context);
		await flush();

		expect(mounted).toHaveLength(1);
	});

	test('ignores a foreign context-provider event without a context', async () => {
		const context = createContext<Shared>(Symbol('foreign'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		defineConsumer(consumerTag, context, []);
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;
		await flush();

		expect(() => {
			document.body.dispatchEvent(new Event('context-provider', { bubbles: true }));
			document.querySelector(providerTag)?.dispatchEvent(new Event('context-provider', { bubbles: true }));
		}).not.toThrow();
	});

	test('honors a protocol-shaped announcement from another implementation', async () => {
		const context = createContext<Shared>(Symbol('protocol'));
		const [providerTag, consumerTag] = [nextTag('provider'), nextTag('consumer')];
		const log: number[] = [];
		defineConsumer(consumerTag, context, log);
		document.body.innerHTML = `<${providerTag}><${consumerTag}></${consumerTag}></${providerTag}>`;
		await flush();
		const providerElement = document.querySelector(providerTag) as HTMLElement;
		const microtask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {});
		new ContextProvider(providerElement as never, { context, initialValue: { value: 9 } });
		microtask.mockRestore();

		class ForeignProviderEvent extends Event {
			constructor(
				public readonly context: unknown,
				public readonly contextTarget: Element,
			) {
				super('context-provider', { bubbles: true, composed: true });
			}
		}
		providerElement.dispatchEvent(new ForeignProviderEvent(context, providerElement));
		await flush();

		expect(log).toEqual([9]);
	});
});
