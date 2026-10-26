import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CUSTOM_ELEMENT_TAG_NAME } from '../src/jsx-runtime.ts';
import { HYDRATE_CLASS_FORM_ELEMENT_HTML } from './fixtures/hydrate-html.ts';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');

const tagName = 'radiant-jsx-interop-element';
const classFormTagName = 'radiant-jsx-class-form-element';

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

class ClassFormElement extends HTMLElement {
	label?: unknown;
}

customElements.define(classFormTagName, ClassFormElement);

describe('Radiant JSX custom-element interop', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders a registered class like its tag string and preserves the host', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const props = { id: 'class-form', label: 'Count', children: jsx('span', { children: '2' }) };

		root.render(jsx(ClassFormElement, props));
		const host = container.querySelector(classFormTagName);
		const classFormMarkup = container.innerHTML;

		root.render(jsx(classFormTagName, props));

		expect(container.innerHTML).toBe(classFormMarkup);
		expect(container.querySelector(classFormTagName)).toBe(host);
	});

	test('hydrates tag-string server markup with the registered class form', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		container.innerHTML = HYDRATE_CLASS_FORM_ELEMENT_HTML;
		const main = container.querySelector('main');
		const host = container.querySelector(classFormTagName);

		createRoot(container).hydrate(
			jsx('main', {
				title: 'server',
				children: jsx(ClassFormElement, {
					id: 'card',
					children: jsx('span', { children: 'inside' }),
				}),
			}),
		);

		expect(container.querySelector('main')).toBe(main);
		expect(container.querySelector(classFormTagName)).toBe(host);
		expect(container.querySelector('span')?.textContent).toBe('inside');
	});

	test('uses registered classes in keyed custom-element lists', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const renderList = (values: string[], type: typeof ClassFormElement | string) =>
			jsx('div', {
				children: values.map((value) => jsx(type, { key: value, 'attr:data-value': value, children: value })),
			});

		root.render(renderList(['a', 'b'], ClassFormElement));
		const [first, second] = container.querySelectorAll(classFormTagName);
		root.render(renderList(['b', 'a'], ClassFormElement));
		expect(container.querySelectorAll(classFormTagName)[0]).toBe(second);
		expect(container.querySelectorAll(classFormTagName)[1]).toBe(first);

		root.render(renderList(['b', 'a'], classFormTagName));
		expect(container.querySelectorAll(classFormTagName)[0]).toBe(second);
		expect(container.querySelectorAll(classFormTagName)[1]).toBe(first);
	});

	test('calls function components without stringifying their source', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const Arrow = (props: { text: string }) => jsx('span', { children: props.text });
		function Declared(props: { text: string }) {
			return jsx('b', { children: props.text });
		}
		const toString = vi.spyOn(Function.prototype, 'toString');

		try {
			expect(jsx(Arrow, { text: 'a' })).toBeTruthy();
			expect(jsx(Declared, { text: 'b' })).toBeTruthy();
			expect(toString).not.toHaveBeenCalled();
		} finally {
			toString.mockRestore();
		}
	});

	test('rejects customized built-in classes with a supported registration hint', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		class CustomizedButtonBase extends HTMLButtonElement {}
		class CustomizedButton extends CustomizedButtonBase {}
		Object.defineProperty(CustomizedButton, CUSTOM_ELEMENT_TAG_NAME, {
			value: 'radiant-jsx-customized-button',
		});

		expect(() => jsx(CustomizedButton, {})).toThrowError(/CustomizedButton .*customized built-ins are unsupported/);
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
let receivedChildrenValues: unknown[] = [];

class ChildrenValueElement extends HTMLElement {
	static [CHILDREN_VALUE] = true;

	set [CHILDREN_VALUE](value: unknown) {
		receivedChildrenValues.push(value);
	}
}

customElements.define('jsx-children-value-element', ChildrenValueElement);

describe('custom elements that take their JSX children as a value', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		receivedChildrenValues = [];
	});

	test('class-form children reach the same children-as-value host contract', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.body.appendChild(document.createElement('div'));
		const root = createRoot(container);
		const children = jsx('b', { children: 'class form' });

		root.render(jsx(ChildrenValueElement, { children }));

		const element = container.querySelector('jsx-children-value-element') as ChildrenValueElement;
		expect(element.childNodes).toHaveLength(0);
		expect(receivedChildrenValues.at(-1)).toBe(children);

		root.render(jsx('jsx-children-value-element', { children }));
		expect(container.querySelector('jsx-children-value-element')).toBe(element);
		expect(receivedChildrenValues.at(-1)).toBe(children);
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
		expect(receivedChildrenValues).toHaveLength(2);
		expect(receivedChildrenValues[1]).toEqual([expect.objectContaining({ values: ['two'] }), null]);
	});

	test('receive a reactive sole child as the reactive value itself', async () => {
		const [{ jsx, createSubscribableJsxValue }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.body.appendChild(document.createElement('div'));
		const label = createSubscribableJsxValue({ getValue: () => 'one', subscribe: () => () => undefined });

		createRoot(container).render(jsx('jsx-children-value-element', { children: label }));

		expect(receivedChildrenValues).toEqual([label]);
	});

	test('keep their server node on hydrate, even in a view whose only markers are inside them', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.body.appendChild(document.createElement('div'));
		container.innerHTML =
			'<section><jsx-children-value-element><p data-radiant-jsx-bind-0="attr:class" class="own"></p></jsx-children-value-element></section>';
		const serverElement = container.querySelector('jsx-children-value-element') as ChildrenValueElement;
		const children = jsx('b', { children: 'one' });

		createRoot(container).hydrate(jsx('section', { children: jsx('jsx-children-value-element', { children }) }));

		expect(container.querySelector('jsx-children-value-element')).toBe(serverElement);
		expect(serverElement.innerHTML).toBe('<p data-radiant-jsx-bind-0="attr:class" class="own"></p>');
		expect(receivedChildrenValues.at(-1)).toBe(children);
	});

	test('render instead of hydrating a root created with DOM children before the tag was defined', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.body.appendChild(document.createElement('div'));
		container.innerHTML =
			'<jsx-late-root-value-element><p data-radiant-jsx-bind-0="attr:class" class="own"></p></jsx-late-root-value-element>';
		const view = jsx('jsx-late-root-value-element', { children: jsx('b', { children: 'one' }) });
		customElements.define('jsx-late-root-value-element', class extends ChildrenValueElement {});

		createRoot(container).hydrate(view);

		expect(container.innerHTML).toBe('<jsx-late-root-value-element><b>one</b></jsx-late-root-value-element>');
	});

	test('render instead of hydrating a root with DOM children whose tag is not defined yet', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.body.appendChild(document.createElement('div'));
		container.innerHTML =
			'<jsx-undefined-root-element><p data-radiant-jsx-bind-0="attr:class" class="own"></p></jsx-undefined-root-element>';

		createRoot(container).hydrate(jsx('jsx-undefined-root-element', { children: jsx('b', { children: 'one' }) }));

		expect(container.innerHTML).toBe('<jsx-undefined-root-element><b>one</b></jsx-undefined-root-element>');
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
		expect(receivedChildrenValues).toEqual([]);
	});
});
