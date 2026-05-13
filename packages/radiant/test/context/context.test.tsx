import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	ContextEventsTypes,
	ContextProvider,
	ContextRequestEvent,
	consumeContext,
	contextSelector,
	createContext,
	onContextUpdate,
	provideContext,
} from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';
import { createCustomElement } from '../utils/create-custom-element';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

type TestContext = {
	value: number;
};

class TestLogger {
	public messages: string[] = [];

	public log(message: string) {
		this.messages.push(message);
	}
}

type LoggerContext = {
	value: number;
	logger: TestLogger;
};

const testContext = createContext<TestContext>(Symbol('todo-context'));
const lazyContext = createContext<TestContext>(Symbol('lazy-context'));
const loggerContext = createContext<LoggerContext>(Symbol('logger-context'));

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
	@onContextUpdate({ context: testContext, select: (context) => context.value })
	onUpdateValue(value: number) {
		this.innerHTML = value.toString();
	}
}

customElements.define('my-context-consumer', MyContextConsumer);

class AutoUpdatingSelectedConsumer extends RadiantElement {
	@contextSelector({ context: testContext, select: (context) => context.value })
	selectedValue: number = 0;

	override render() {
		return this.selectedValue.toString();
	}
}

customElements.define('auto-updating-selected-consumer', AutoUpdatingSelectedConsumer);

class AutoUpdatingFullContextConsumer extends RadiantElement {
	@contextSelector({ context: testContext })
	contextValue: TestContext = { value: 0 };

	override render() {
		return this.contextValue.value.toString();
	}
}

customElements.define('auto-updating-full-context-consumer', AutoUpdatingFullContextConsumer);

class OptOutAutoUpdatingConsumer extends RadiantElement {
	@consumeContext(testContext) context!: ContextProvider<typeof testContext>;
	contextChangeCount = 0;

	@onContextUpdate({ context: testContext, requestUpdate: false })
	onContextChanged(_: TestContext) {
		this.contextChangeCount += 1;
	}

	override render() {
		return this.context.getContext().value.toString();
	}
}

customElements.define('opt-out-auto-updating-consumer', OptOutAutoUpdatingConsumer);

class SelectedSliceEffectConsumer extends RadiantElement {
	changeCount = 0;

	@onContextUpdate({ context: loggerContext, select: (context) => context.value })
	onValueChanged(_: number) {
		this.changeCount += 1;
	}
}

customElements.define('selected-slice-effect-consumer', SelectedSliceEffectConsumer);

class SelectedSliceRenderConsumer extends RadiantElement {
	requestUpdateCount = 0;

	@contextSelector({ context: loggerContext, select: (context) => context.value })
	selectedValue = 0;

	override requestUpdate(): void {
		this.requestUpdateCount += 1;
		super.requestUpdate();
	}

	override render() {
		return this.selectedValue.toString();
	}
}

customElements.define('selected-slice-render-consumer', SelectedSliceRenderConsumer);

const nestedHydrationContext = createContext<TestContext>(Symbol('nested-hydration-context'));

class NestedOuterContextProvider extends RadiantElement {
	@provideContext<typeof nestedHydrationContext>({
		context: nestedHydrationContext,
		initialValue: { value: 1 },
		hydrate: Object,
	})
	context!: ContextProvider<typeof nestedHydrationContext>;
}

customElements.define('nested-outer-context-provider', NestedOuterContextProvider);

class NestedInnerContextProvider extends RadiantElement {
	@provideContext<typeof nestedHydrationContext>({
		context: nestedHydrationContext,
		initialValue: { value: 2 },
		hydrate: Object,
	})
	context!: ContextProvider<typeof nestedHydrationContext>;
}

customElements.define('nested-inner-context-provider', NestedInnerContextProvider);

class LazyContextProvider extends RadiantElement {
	@provideContext<typeof lazyContext>({
		context: lazyContext,
	})
	context!: ContextProvider<typeof lazyContext>;
}

customElements.define('lazy-context-provider', LazyContextProvider);

class LazySelectedConsumer extends RadiantElement {
	@contextSelector({ context: lazyContext, select: (context) => context.value })
	selectedValue = 0;

	override render() {
		return this.selectedValue.toString();
	}
}

customElements.define('lazy-selected-consumer', LazySelectedConsumer);

class LoggerContextProvider extends RadiantElement {
	@provideContext<typeof loggerContext>({
		context: loggerContext,
		initialValue: { value: 1, logger: new TestLogger() },
		hydrate: Object,
		serialize: ({ value }) => ({ value }),
	})
	context!: ContextProvider<typeof loggerContext>;
}

customElements.define('logger-context-provider', LoggerContextProvider);

describe('Context', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('it provides and consumes context correctly', async () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = createCustomElement<MyContextConsumer>('my-context-consumer');
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
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');

		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			contextProvider.context.setContext(initialValue);
			expect(contextProvider.context.getContext()).toEqual(initialValue);
		});
	});

	test('it sets and gets context correctly', async () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const update = { value: 20 };
		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			contextProvider.context.setContext(update);
			expect(contextProvider.context.getContext()).toEqual(update);
		});
	});

	test('it can initialize context from a later object update when no initial value is provided', () => {
		const contextProvider = createCustomElement<LazyContextProvider>('lazy-context-provider');
		const update = { value: 42 };

		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			contextProvider.context.setContext(update);
			expect(contextProvider.context.getContext()).toEqual(update);
		});

		document.body.appendChild(contextProvider);
	});

	test('it cleans up lazy selector subscriptions before the provider gets its first value', async () => {
		const contextProvider = createCustomElement<LazyContextProvider>('lazy-context-provider');
		const contextConsumer = createCustomElement<LazySelectedConsumer>('lazy-selected-consumer');
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(1);
			expect(contextConsumer.textContent).toBe('0');
		});

		contextConsumer.remove();

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(0);
		});

		contextProvider.context.setContext({ value: 9 });
		expect(contextProvider.context.getContext()).toEqual({ value: 9 });

		contextProvider.appendChild(contextConsumer);

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(1);
			expect(contextConsumer.textContent).toBe('9');
		});
	});

	test('it does not duplicate selector subscriptions across disconnect and reconnect', async () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = document.createElement(
			'auto-updating-selected-consumer',
		) as AutoUpdatingSelectedConsumer;
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(1);
			expect(contextConsumer.textContent).toBe('1');
		});

		contextConsumer.remove();

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(0);
		});

		contextProvider.appendChild(contextConsumer);

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(1);
			expect(contextConsumer.textContent).toBe('1');
		});

		contextProvider.context.setContext({ value: 5 });

		await waitFor(() => {
			expect(contextProvider.context.subscriptions).toHaveLength(1);
			expect(contextConsumer.textContent).toBe('5');
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

		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = createCustomElement<MyContextConsumer>('manual-context-element');
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);
		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			expect(callback).toHaveBeenCalled();
		});
	});

	test('it notifies all subscribers even when mixed selector and non-selector subscriptions are present', async () => {
		const selectorCallback = vi.fn();
		const fullContextCallback = vi.fn();

		class MixedSubscriberConsumer extends RadiantElement {
			@onContextUpdate({ context: testContext })
			onContext(context: TestContext) {
				fullContextCallback(context);
			}

			@onContextUpdate({ context: testContext, select: (context) => context.value })
			onValue(value: number) {
				selectorCallback(value);
			}
		}

		customElements.define('mixed-subscriber-consumer', MixedSubscriberConsumer);

		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = createCustomElement<MixedSubscriberConsumer>('mixed-subscriber-consumer');
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(fullContextCallback).toHaveBeenCalledWith({ value: 1 });
			expect(selectorCallback).toHaveBeenCalledWith(1);
		});

		contextProvider.context.setContext({ value: 4 });

		expect(fullContextCallback).toHaveBeenLastCalledWith({ value: 4 });
		expect(selectorCallback).toHaveBeenLastCalledWith(4);
	});

	test('@onContextUpdate skips side effects when the selected slice is unchanged', async () => {
		const contextProvider = createCustomElement<LoggerContextProvider>('logger-context-provider');
		const contextConsumer = createCustomElement<SelectedSliceEffectConsumer>('selected-slice-effect-consumer');
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextConsumer.changeCount).toBe(1);
		});

		contextProvider.context.setContext({ value: 1, logger: new TestLogger() });
		expect(contextConsumer.changeCount).toBe(1);

		contextProvider.context.setContext({ value: 2, logger: new TestLogger() });
		expect(contextConsumer.changeCount).toBe(2);
	});

	test('field @contextSelector skips requestUpdate when the selected slice is unchanged', async () => {
		const contextProvider = createCustomElement<LoggerContextProvider>('logger-context-provider');
		const contextConsumer = createCustomElement<SelectedSliceRenderConsumer>('selected-slice-render-consumer');
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('1');
		});

		const initialRequestUpdateCount = contextConsumer.requestUpdateCount;
		contextProvider.context.setContext({ value: 1, logger: new TestLogger() });
		expect(contextConsumer.requestUpdateCount).toBe(initialRequestUpdateCount);

		contextProvider.context.setContext({ value: 3, logger: new TestLogger() });

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('3');
		});
		expect(contextConsumer.requestUpdateCount).toBeGreaterThan(initialRequestUpdateCount);
	});

	test('field @contextSelector auto-rerenders RadiantElement when a selected slice changes', async () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = document.createElement(
			'auto-updating-selected-consumer',
		) as AutoUpdatingSelectedConsumer;
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('1');
		});

		contextProvider.context.setContext({ value: 7 });

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('7');
		});
	});

	test('field @contextSelector auto-rerenders RadiantElement when the full context changes', async () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = document.createElement(
			'auto-updating-full-context-consumer',
		) as AutoUpdatingFullContextConsumer;
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('1');
		});

		contextProvider.context.setContext({ value: 9 });

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('9');
		});
	});

	test('@onContextUpdate can opt out of automatic requestUpdate on RadiantElement consumers', async () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = createCustomElement<OptOutAutoUpdatingConsumer>('opt-out-auto-updating-consumer');
		contextProvider.appendChild(contextConsumer);
		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextConsumer.innerHTML).toBe('1');
		});
		expect(contextConsumer.contextChangeCount).toBe(1);

		contextProvider.context.setContext({ value: 11 });

		await waitFor(() => {
			expect(contextConsumer.contextChangeCount).toBe(2);
		});

		expect(contextConsumer.innerHTML).toBe('1');
	});

	test('it hydrates provider context from SSR markup and delivers it to nested consumers on connect', async () => {
		document.body.innerHTML = `<my-context-provider><script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">{"value":42}</script><my-context-consumer></my-context-consumer></my-context-provider>`;

		const contextProvider = document.querySelector('my-context-provider') as MyContextProvider | null;
		const contextConsumer = document.querySelector('my-context-consumer') as MyContextConsumer | null;

		expect(contextProvider).not.toBeNull();
		expect(contextConsumer).not.toBeNull();

		await waitFor(() => {
			expect(contextProvider?.context.getContext()).toEqual({ value: 42 });
			expect(contextConsumer?.innerHTML).toEqual('42');
		});
	});

	test('it exposes a first-class hydration script helper on providers', () => {
		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		document.body.appendChild(contextProvider);
		const scriptMarkup = contextProvider.context.renderHydrationScriptTag();

		expect(scriptMarkup).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(scriptMarkup).toContain('{"value":1}');
	});

	test('it can dehydrate only the serializable slice of a provider context', () => {
		const contextProvider = createCustomElement<LoggerContextProvider>('logger-context-provider');
		document.body.appendChild(contextProvider);
		const scriptMarkup = contextProvider.context.renderHydrationScriptTag();

		expect(scriptMarkup).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(scriptMarkup).toContain('{"value":1}');
		expect(scriptMarkup).not.toContain('logger');
	});

	describeWhenStandard('pre-connect provider initialization', () => {
		test('it initializes a provided context before connect so server helpers can configure it', () => {
			const contextProvider = new LoggerContextProvider();

			expect(contextProvider.context).toBeInstanceOf(ContextProvider);
			contextProvider.context.setContext({ value: 5 });
			expect(contextProvider.context.getContext().value).toBe(5);
			expect(contextProvider.context.getContext().logger).toBeInstanceOf(TestLogger);
		});
	});

	test('it tolerates SSR hosts without a DOM children collection', () => {
		const provider = new ContextProvider(
			{
				addEventListener: () => undefined,
				children: undefined,
				dispatchEvent: () => true,
			} as unknown as MyContextProvider,
			{
				context: testContext,
				initialValue: { value: 7 },
				hydrate: Object,
			},
		);

		expect(provider.getContext()).toEqual({ value: 7 });
	});

	test('it hydrates from element childNodes when a host has no children collection', () => {
		const hydrationScript = document.createElement('script');
		hydrationScript.setAttribute('type', 'application/json');
		hydrationScript.setAttribute('data-hydration', '');
		hydrationScript.setAttribute('data-hydration-type', 'context');
		hydrationScript.setAttribute('data-hydration-key', 'context');
		hydrationScript.textContent = '{"value":42}';

		const provider = new ContextProvider(
			{
				addEventListener: () => undefined,
				children: undefined,
				childNodes: [hydrationScript],
				dispatchEvent: () => true,
			} as unknown as MyContextProvider,
			{
				context: testContext,
				hydrationKey: 'context',
				initialValue: { value: 7 },
				hydrate: Object,
			},
		);

		expect(provider.getContext()).toEqual({ value: 42 });
	});

	test('it hydrates each nested provider from its own keyed SSR script', async () => {
		document.body.innerHTML =
			'<nested-outer-context-provider>' +
			'<nested-inner-context-provider>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">{"value":99}</script>' +
			'</nested-inner-context-provider>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">{"value":41}</script>' +
			'</nested-outer-context-provider>';

		const outerProvider = document.querySelector(
			'nested-outer-context-provider',
		) as NestedOuterContextProvider | null;
		const innerProvider = document.querySelector(
			'nested-inner-context-provider',
		) as NestedInnerContextProvider | null;

		expect(outerProvider).not.toBeNull();
		expect(innerProvider).not.toBeNull();

		await waitFor(() => {
			expect(outerProvider?.context.getContext()).toEqual({ value: 41 });
			expect(innerProvider?.context.getContext()).toEqual({ value: 99 });
		});
	});

	test('it resolves consumeContext and onContextUpdate after a detached child connects under a provider', async () => {
		class DelayedContextConsumer extends RadiantElement {
			@consumeContext(testContext) context!: ContextProvider<typeof testContext>;

			@onContextUpdate({ context: testContext, select: (context) => context.value })
			onValue(value: number) {
				this.textContent = String(value);
			}

			readValue() {
				return this.context.getContext().value;
			}
		}

		customElements.define('delayed-context-consumer', DelayedContextConsumer);

		const contextProvider = createCustomElement<MyContextProvider>('my-context-provider');
		const contextConsumer = createCustomElement<DelayedContextConsumer>('delayed-context-consumer');

		contextProvider.appendChild(contextConsumer);
		expect(contextConsumer.isConnected).toBe(false);

		document.body.appendChild(contextProvider);

		await waitFor(() => {
			expect(contextConsumer.readValue()).toBe(1);
			expect(contextConsumer.textContent).toBe('1');
		});

		contextProvider.context.setContext({ value: 6 });

		await waitFor(() => {
			expect(contextConsumer.readValue()).toBe(6);
			expect(contextConsumer.textContent).toBe('6');
		});
	});

	test('it resolves consumeContext when the provider custom element upgrades after the child connects', async () => {
		const lateContext = createContext<TestContext>(Symbol('late-upgrade-context'));

		class LateUpgradeConsumer extends RadiantElement {
			@consumeContext(lateContext) context!: ContextProvider<typeof lateContext>;

			readValue() {
				return this.context.getContext().value;
			}
		}

		customElements.define('late-upgrade-consumer', LateUpgradeConsumer);

		document.body.innerHTML =
			'<late-upgrade-provider><late-upgrade-consumer></late-upgrade-consumer></late-upgrade-provider>';

		class LateUpgradeProvider extends RadiantElement {
			@provideContext<typeof lateContext>({
				context: lateContext,
				initialValue: { value: 9 },
			})
			context!: ContextProvider<typeof lateContext>;
		}

		customElements.define('late-upgrade-provider', LateUpgradeProvider);

		const consumer = document.querySelector('late-upgrade-consumer') as LateUpgradeConsumer | null;

		expect(consumer).not.toBeNull();

		await waitFor(() => {
			expect(consumer?.readValue()).toBe(9);
		});
	});

	test('it preserves client-only initial members when a dehydrated object payload hydrates back in', async () => {
		document.body.innerHTML =
			'<logger-context-provider>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">{"value":42}</script>' +
			'</logger-context-provider>';

		const contextProvider = document.querySelector('logger-context-provider') as LoggerContextProvider | null;

		expect(contextProvider).not.toBeNull();

		await waitFor(() => {
			expect(contextProvider?.context.getContext().value).toBe(42);
			expect(contextProvider?.context.getContext().logger).toBeInstanceOf(TestLogger);
		});

		contextProvider?.context.getContext().logger.log('hydrated');
		expect(contextProvider?.context.getContext().logger.messages).toEqual(['hydrated']);
	});
});
