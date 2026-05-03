import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { onContextUpdate } from '../../src/context/decorators/on-context-update';
import { provideContext } from '../../src/context/decorators/provide-context';
import { ContextEventsTypes, ContextRequestEvent } from '../../src/context/events';
import { RadiantComponent } from '../../src/core/radiant-component';
import { RadiantElement } from '../../src/core/radiant-element';

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

class AutoUpdatingSelectedConsumer extends RadiantComponent {
	@contextSelector({ context: testContext, select: (context) => context.value })
	selectedValue: number = 0;

	override render() {
		return this.selectedValue.toString();
	}
}

if (!customElements.get('auto-updating-selected-consumer')) {
	customElements.define('auto-updating-selected-consumer', AutoUpdatingSelectedConsumer);
}

class AutoUpdatingFullContextConsumer extends RadiantComponent {
	@contextSelector({ context: testContext })
	contextValue: TestContext = { value: 0 };

	override render() {
		return this.contextValue.value.toString();
	}
}

if (!customElements.get('auto-updating-full-context-consumer')) {
	customElements.define('auto-updating-full-context-consumer', AutoUpdatingFullContextConsumer);
}

class OptOutAutoUpdatingConsumer extends RadiantComponent {
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

if (!customElements.get('opt-out-auto-updating-consumer')) {
	customElements.define('opt-out-auto-updating-consumer', OptOutAutoUpdatingConsumer);
}

class SelectedSliceEffectConsumer extends RadiantElement {
	changeCount = 0;

	@onContextUpdate({ context: loggerContext, select: (context) => context.value })
	onValueChanged(_: number) {
		this.changeCount += 1;
	}
}

if (!customElements.get('selected-slice-effect-consumer')) {
	customElements.define('selected-slice-effect-consumer', SelectedSliceEffectConsumer);
}

class SelectedSliceRenderConsumer extends RadiantComponent {
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

if (!customElements.get('selected-slice-render-consumer')) {
	customElements.define('selected-slice-render-consumer', SelectedSliceRenderConsumer);
}

const nestedHydrationContext = createContext<TestContext>(Symbol('nested-hydration-context'));

class NestedOuterContextProvider extends RadiantElement {
	@provideContext<typeof nestedHydrationContext>({
		context: nestedHydrationContext,
		initialValue: { value: 1 },
		hydrate: Object,
	})
	context!: ContextProvider<typeof nestedHydrationContext>;
}

if (!customElements.get('nested-outer-context-provider')) {
	customElements.define('nested-outer-context-provider', NestedOuterContextProvider);
}

class NestedInnerContextProvider extends RadiantElement {
	@provideContext<typeof nestedHydrationContext>({
		context: nestedHydrationContext,
		initialValue: { value: 2 },
		hydrate: Object,
	})
	context!: ContextProvider<typeof nestedHydrationContext>;
}

if (!customElements.get('nested-inner-context-provider')) {
	customElements.define('nested-inner-context-provider', NestedInnerContextProvider);
}

class LazyContextProvider extends RadiantElement {
	@provideContext<typeof lazyContext>({
		context: lazyContext,
	})
	context!: ContextProvider<typeof lazyContext>;
}

if (!customElements.get('lazy-context-provider')) {
	customElements.define('lazy-context-provider', LazyContextProvider);
}

class LoggerContextProvider extends RadiantElement {
	@provideContext<typeof loggerContext>({
		context: loggerContext,
		initialValue: { value: 1, logger: new TestLogger() },
		hydrate: Object,
		serialize: ({ value }) => ({ value }),
	})
	context!: ContextProvider<typeof loggerContext>;
}

if (!customElements.get('logger-context-provider')) {
	customElements.define('logger-context-provider', LoggerContextProvider);
}

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

	test('it can initialize context from a later object update when no initial value is provided', () => {
		const contextProvider = document.createElement('lazy-context-provider') as LazyContextProvider;
		const update = { value: 42 };

		contextProvider.addEventListener(ContextEventsTypes.MOUNTED, () => {
			contextProvider.context.setContext(update);
			expect(contextProvider.context.getContext()).toEqual(update);
		});

		document.body.appendChild(contextProvider);
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

		if (!customElements.get('mixed-subscriber-consumer')) {
			customElements.define('mixed-subscriber-consumer', MixedSubscriberConsumer);
		}

		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		const contextConsumer = document.createElement('mixed-subscriber-consumer') as MixedSubscriberConsumer;
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
		const contextProvider = document.createElement('logger-context-provider') as LoggerContextProvider;
		const contextConsumer = document.createElement('selected-slice-effect-consumer') as SelectedSliceEffectConsumer;
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
		const contextProvider = document.createElement('logger-context-provider') as LoggerContextProvider;
		const contextConsumer = document.createElement('selected-slice-render-consumer') as SelectedSliceRenderConsumer;
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

	test('field @contextSelector auto-rerenders RadiantComponent when a selected slice changes', async () => {
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
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

	test('field @contextSelector auto-rerenders RadiantComponent when the full context changes', async () => {
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
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

	test('@onContextUpdate can opt out of automatic requestUpdate on RadiantComponent consumers', async () => {
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		const contextConsumer = document.createElement('opt-out-auto-updating-consumer') as OptOutAutoUpdatingConsumer;
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
		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		document.body.appendChild(contextProvider);
		const scriptMarkup = contextProvider.context.renderHydrationScriptTag();

		expect(scriptMarkup).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="context">',
		);
		expect(scriptMarkup).toContain('{"value":1}');
	});

	test('it can dehydrate only the serializable slice of a provider context', () => {
		const contextProvider = document.createElement('logger-context-provider') as LoggerContextProvider;
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

		if (!customElements.get('delayed-context-consumer')) {
			customElements.define('delayed-context-consumer', DelayedContextConsumer);
		}

		const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
		const contextConsumer = document.createElement('delayed-context-consumer') as DelayedContextConsumer;

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

		if (!customElements.get('late-upgrade-consumer')) {
			customElements.define('late-upgrade-consumer', LateUpgradeConsumer);
		}

		document.body.innerHTML =
			'<late-upgrade-provider><late-upgrade-consumer></late-upgrade-consumer></late-upgrade-provider>';

		class LateUpgradeProvider extends RadiantElement {
			@provideContext<typeof lateContext>({
				context: lateContext,
				initialValue: { value: 9 },
			})
			context!: ContextProvider<typeof lateContext>;
		}

		if (!customElements.get('late-upgrade-provider')) {
			customElements.define('late-upgrade-provider', LateUpgradeProvider);
		}

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
