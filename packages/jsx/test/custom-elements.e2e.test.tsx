import { beforeEach, describe, expect, test, vi } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');

const tagName = 'radiant-jsx-interop-element';

type InteropElement = HTMLElement & {
	camelCaseValue?: unknown;
	config?: unknown;
	controller?: unknown;
	items?: unknown;
	label?: unknown;
	status?: unknown;
};

class RadiantJsxInteropElement extends HTMLElement {
	camelCaseValue?: unknown;
	config?: unknown;
	controller?: unknown;
	items?: unknown;
	label?: unknown;
	status?: unknown;

	connectedCallback(): void {
		if (this.shadowRoot) {
			return;
		}

		const shadowRoot = this.attachShadow({ mode: 'open' });
		const slot = document.createElement('slot');
		shadowRoot.append(slot);
	}
}

customElements.define(tagName, RadiantJsxInteropElement);

describe('Radiant JSX custom-element interop', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders custom elements with light DOM children and shadow DOM slots', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx(tagName, {
				children: jsx('span', { children: 'Hello custom element' }),
			}),
		);

		const element = container.querySelector(tagName) as InteropElement | null;
		expect(element).not.toBeNull();
		expect(element?.shadowRoot?.querySelector('slot')).not.toBeNull();
		expect(element?.querySelector('span')?.textContent).toBe('Hello custom element');
	});

	test('defaults obvious names to attributes and the rest to properties', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const items = [{ id: 1 }];
		const config = { mode: 'grid' };

		root.render(
			jsx(tagName, {
				id: 'people-grid',
				class: 'panel',
				items,
				config,
				label: 'Users',
				camelCaseValue: 42,
			}),
		);

		const element = container.querySelector(tagName) as InteropElement | null;
		expect(element).not.toBeNull();
		expect(element?.getAttribute('id')).toBe('people-grid');
		expect(element?.getAttribute('class')).toBe('panel');
		expect(element?.getAttribute('items')).toBeNull();
		expect(element?.items).toBe(items);
		expect(element?.config).toBe(config);
		expect(element?.label).toBe('Users');
		expect(element?.camelCaseValue).toBe(42);
	});

	test('supports explicit attr and prop overrides', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const controller = { dispose: vi.fn() };

		root.render(
			jsx(tagName, {
				'attr:status': 'ready',
				'prop:controller': controller,
			}),
		);

		const element = container.querySelector(tagName) as InteropElement | null;
		expect(element).not.toBeNull();
		expect(element?.getAttribute('status')).toBe('ready');
		expect(element?.controller).toBe(controller);
	});

	for (const eventName of ['change', 'value-changed', 'valueChanged', 'VALUEChanged', 'ValueChanged'] as const) {
		test(`listens to custom events named ${eventName}`, async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const root = createRoot(container);
			const handler = vi.fn((event: Event) => event.type);

			root.render(
				jsx(tagName, {
					[`on:${eventName}`]: handler,
				}),
			);

			const element = container.querySelector(tagName) as InteropElement | null;
			element?.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail: { ok: true } }));

			expect(handler).toHaveBeenCalledTimes(1);
			const [firstEvent] = handler.mock.calls[0] ?? [];
			expect(firstEvent).toBeInstanceOf(CustomEvent);
			expect((firstEvent as Event | undefined)?.type).toBe(eventName);
		});
	}
});

const CHILDREN_VALUE: unique symbol = Symbol.for('@ecopages/jsx.custom-element-children');

class ChildrenValueElement extends HTMLElement {
	static [CHILDREN_VALUE] = true;
	received: unknown[] = [];

	set [CHILDREN_VALUE](value: unknown) {
		this.received.push(value);
	}
}

customElements.define('jsx-children-value-element', ChildrenValueElement);

describe('custom elements that take their JSX children as a value', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('get no DOM children and receive the children again on every render', async () => {
		const [{ jsx, jsxs }, { createRoot, CUSTOM_ELEMENT_CHILDREN_SYMBOL }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		expect(CUSTOM_ELEMENT_CHILDREN_SYMBOL).toBe(CHILDREN_VALUE);
		const container = document.body.appendChild(document.createElement('div'));
		const root = createRoot(container);
		const view = (label: string) =>
			jsxs('jsx-children-value-element', {
				children: [jsx('b', { children: label }), null],
			});

		root.render(view('one'));
		const element = container.querySelector('jsx-children-value-element') as ChildrenValueElement;
		root.render(view('two'));

		expect(container.querySelector('jsx-children-value-element')).toBe(element);
		expect(element.childNodes).toHaveLength(0);
		expect(element.received).toHaveLength(2);
		expect(element.received[1]).toEqual([expect.objectContaining({ values: ['two'] }), null]);
	});

	test('receive a reactive sole child as the reactive value itself', async () => {
		const [{ jsx, createSubscribableJsxValue }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.body.appendChild(document.createElement('div'));
		const label = createSubscribableJsxValue({ getValue: () => 'one', subscribe: () => () => undefined });

		createRoot(container).render(jsx('jsx-children-value-element', { children: label }));

		const element = container.querySelector('jsx-children-value-element') as ChildrenValueElement;
		expect(element.received).toEqual([label]);
	});

	test('keep DOM children when the tag is defined after the view created the element', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.body.appendChild(document.createElement('div'));

		createRoot(container).render(
			jsx('jsx-late-children-value-element', { children: jsx('b', { children: 'one' }) }),
		);
		customElements.define('jsx-late-children-value-element', class extends ChildrenValueElement {});

		const element = container.querySelector('jsx-late-children-value-element') as ChildrenValueElement;
		expect(element.querySelector('b')?.textContent).toBe('one');
		expect(element.received).toEqual([]);
	});
});
