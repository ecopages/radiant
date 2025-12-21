import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { ContextEventsTypes, ContextRequestEvent } from '../../src/context/events';
import { RadiantElement } from '../../src/core/radiant-element';

type TestContext = {
	value: number;
};

const testContext = createContext<TestContext>(Symbol('todo-context'));

class MyContextProvider extends RadiantElement {
	@provideContext<typeof testContext>({
		context: testContext,
		initialValue: { value: 1 },
		hydrate: Object,
	})
	context!: ContextProvider<typeof testContext>;
}

customElements.define('my-context-provider', MyContextProvider);

class MyContextConsumer extends RadiantElement {
	@consumeContext(testContext) context!: ContextProvider<typeof testContext>;
	@contextSelector({ context: testContext, select: (context) => context.value })
	onUpdateValue(value: number) {
		this.innerHTML = value.toString();
	}
}

customElements.define('my-context-consumer', MyContextConsumer);

describe('Context', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('it provides and consumes context correctly', async () => {
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		const contextConsumer = document.createElement('my-context-consumer') as MyContextConsumer;
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		contextConsumer.addEventListener(ContextEventsTypes.MOUNTED, async () => {
			expect(contextConsumer.innerHTML).toEqual('1');
			contextProvider.context.setContext({ value: 3 });
			expect(contextConsumer.innerHTML).toEqual('3');
			contextProvider.context.setContext({ value: 3 });
			expect(contextConsumer.innerHTML).toEqual('5');
		});
	});

	test('it initializes with the provided context and initial value', () => {
		const initialValue = { value: 10 };
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;

		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			contextProvider.context.setContext(initialValue);
			expect(contextProvider.context.getContext()).toEqual(initialValue);
		});
	});

	test('it sets and gets context correctly', async () => {
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		const update = { value: 20 };
		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			contextProvider.context.setContext(update);
			expect(contextProvider.context.getContext()).toEqual(update);
		});
	});

	test('it notifies subscribers on context update', () => {
		const callback = vi.fn();
		class ManualConsumer extends RadiantElement {
			context!: ContextProvider<typeof testContext>;
			override connectedCallback() {
				super.connectedCallback();
				this.dispatchEvent(new ContextRequestEvent(testContext, callback, true));
			}
		}
		customElements.define('manual-context-element', ManualConsumer);

		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		const contextConsumer = document.createElement('manual-context-element') as MyContextConsumer;
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);
		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			expect(callback).toHaveBeenCalled();
		});
	});
});
