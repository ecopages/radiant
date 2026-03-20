import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'lit/html.js';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../jsx-runtime.ts')>('../jsx-runtime.ts');
const loadJsxDevRuntime = async () => loadModule<typeof import('../jsx-dev-runtime.ts')>('../jsx-dev-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../index.ts')>('../index.ts');

class PropertyReceiverElement extends HTMLElement {
	declare payload: unknown;
}

class NestedHostElement extends HTMLElement {}

if (!customElements.get('property-receiver')) {
	customElements.define('property-receiver', PropertyReceiverElement);
}

if (!customElements.get('nested-host')) {
	customElements.define('nested-host', NestedHostElement);
}

describe('Radiant JSX Lit interoperability smoke tests', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders intrinsic elements into the DOM through Lit', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const container = document.createElement('div');

		render(
			jsx('div', {
				class: 'counter',
				children: 'Hello JSX',
			}),
			container,
		);

		const element = container.querySelector('div');
		expect(element).not.toBeNull();
		expect(element?.className).toBe('counter');
		expect(element?.textContent).toBe('Hello JSX');
	});

	test('renders component props through child components into the DOM through Lit', async () => {
		const [{ jsx, jsxs }] = await Promise.all([loadJsxRuntime()]);
		const container = document.createElement('div');

		const Label = ({ text }: { text: string }) => jsx('span', { class: 'label', children: text });
		const Field = ({ label, value }: { label: string; value: string }) =>
			jsxs('label', {
				class: 'field',
				children: [jsx(Label, { text: label }), jsx('strong', { children: value })],
			});

		render(jsx(Field, { label: 'Status', value: 'Ready' }), container);

		const field = container.querySelector('label.field');
		expect(field?.querySelector('span.label')?.textContent).toBe('Status');
		expect(field?.querySelector('strong')?.textContent).toBe('Ready');
	});

	test('merges classes and forwards handler props through plain function components', async () => {
		const [{ jsx, jsxs }] = await Promise.all([loadJsxRuntime()]);
		const container = document.createElement('div');
		const handlePress = vi.fn();

		const ActionButton = ({
			label,
			onPress,
			active,
		}: {
			label: string;
			onPress: (event: Event) => void;
			active?: boolean;
		}) =>
			jsx('button', {
				type: 'button',
				classes: ['action-button', { 'action-button--active': active }],
				'on:click': onPress,
				children: label,
			});

		const Toolbar = () =>
			jsxs('div', {
				classes: ['toolbar', { 'toolbar--interactive': true }],
				children: [jsx(ActionButton, { label: 'Ship it', onPress: handlePress, active: true })],
			});

		render(jsx(Toolbar, {}), container);

		const toolbar = container.querySelector('div');
		const button = container.querySelector('button');
		expect(toolbar?.className).toBe('toolbar toolbar--interactive');
		expect(button?.className).toBe('action-button action-button--active');

		button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(handlePress).toHaveBeenCalledTimes(1);
	});

	test('binds DOM events through Lit', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const container = document.createElement('div');
		let receivedCurrentTarget: EventTarget | null | undefined;
		const handleClick = vi.fn((event: Event) => {
			receivedCurrentTarget = event.currentTarget;
		});

		render(
			jsx('button', {
				'on:click': handleClick,
				children: 'Increment',
			}),
			container,
		);

		const button = container.querySelector('button');
		button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleClick).toHaveBeenCalledWith(expect.any(MouseEvent));
		expect(receivedCurrentTarget).toBe(button);
	});

	test('assigns object values into nested custom elements through Lit property bindings', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const container = document.createElement('div');
		const payload = { value: 1, state: 'ready' };

		render(
			jsx('nested-host', {
				children: jsx('property-receiver', {
					'prop:payload': payload,
				}),
			}),
			container,
		);

		const receiver = container
			.querySelector('nested-host')
			?.querySelector('property-receiver') as PropertyReceiverElement | null;
		expect(receiver).not.toBeNull();
		expect(receiver?.payload).toBe(payload);
		expect(receiver?.getAttribute('payload')).toBeNull();
	});

	test('renders boolean, data, and aria bindings through Lit', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const container = document.createElement('div');

		render(
			jsx('button', {
				hidden: true,
				data: { tid: 'counter' },
				aria: { label: 'Decrement' },
				children: '-',
			}),
			container,
		);

		const button = container.querySelector('button');
		expect(button?.hasAttribute('hidden')).toBe(true);
		expect(button?.getAttribute('data-tid')).toBe('counter');
		expect(button?.getAttribute('aria-label')).toBe('Decrement');
	});

	test('jsxDEV renders through Lit with the same behavior', async () => {
		const [{ jsxDEV }] = await Promise.all([loadJsxDevRuntime()]);
		const container = document.createElement('div');

		render(jsxDEV('div', { children: 'Dev runtime' }), container);

		expect(container.querySelector('div')?.textContent).toBe('Dev runtime');
	});

	test('createRoot mounts and rerenders plain JSX function components without Radiant helpers', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let count = 0;

		const CounterView = () => {
			function handleClick() {
				count += 1;
				root.render(jsx(CounterView, {}));
			}

			return jsx('button', {
				type: 'button',
				'on:click': handleClick,
				children: `Count ${count}`,
			});
		};

		root.render(jsx(CounterView, {}));

		const button = container.querySelector('button');
		expect(button?.textContent).toBe('Count 0');

		button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(container.querySelector('button')?.textContent).toBe('Count 1');

		root.unmount();
		expect(container.innerHTML).toBe('');
	});

	test('createRoot preserves input focus and cursor position across rerenders', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		let value = 'ab';

		const SearchView = () => {
			const handleInput = (event: Event) => {
				value = (event.currentTarget as HTMLInputElement).value;
				root.render(jsx(SearchView, {}));
			};

			return jsx('label', {
				children: [
					jsx('span', { children: 'Query' }),
					jsx('input', {
						type: 'text',
						'prop:value': value,
						'on:input': handleInput,
					}),
				],
			});
		};

		root.render(jsx(SearchView, {}));

		const input = container.querySelector('input');
		input?.focus();
		input!.value = 'axb';
		input?.setSelectionRange(1, 1);
		input?.dispatchEvent(new Event('input', { bubbles: true }));

		const rerenderedInput = container.querySelector('input');
		expect(document.activeElement).toBe(rerenderedInput);
		expect(rerenderedInput?.selectionStart).toBe(1);
		expect(rerenderedInput?.selectionEnd).toBe(1);
		expect(rerenderedInput?.value).toBe('axb');
	});

	test('createRoot reapplies controlled prop values when the DOM drifts between renders', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let draft = 'Initial note';

		const EditorView = () =>
			jsx('div', {
				children: jsx('input', {
					'prop:value': draft,
					'data-testid': 'note-input',
					type: 'text',
				}),
			});

		root.render(jsx(EditorView, {}));

		const input = container.querySelector('[data-testid="note-input"]') as HTMLInputElement | null;
		expect(input?.value).toBe('Initial note');

		if (!input) {
			throw new Error('expected controlled input to render');
		}

		draft = 'Published from JSX note editor';
		root.render(jsx(EditorView, {}));
		expect(input.value).toBe('Published from JSX note editor');

		input.value = 'Unsaved local edit';
		root.render(jsx(EditorView, {}));
		expect(input.value).toBe('Published from JSX note editor');
	});

	test('hydrate attaches event listeners without replacing SSR DOM', async () => {
		const [{ jsx }, { hydrate, renderToString }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const handleClick = vi.fn();

		container.innerHTML = renderToString(
			jsx('button', {
				class: 'action',
				'on:click': handleClick,
				children: 'Hydrate me',
			}),
			{ hydrate: true },
		);

		const button = container.querySelector('button');

		hydrate(
			jsx('button', {
				class: 'action',
				'on:click': handleClick,
				children: 'Hydrate me',
			}),
			container,
		);

		expect(container.querySelector('button')).toBe(button);
		expect(button?.getAttributeNames().some((name) => name.startsWith('data-radiant-jsx-bind-'))).toBe(false);

		button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('hydrate restores property bindings onto existing SSR DOM', async () => {
		const [{ jsx }, { hydrate, renderToString }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const payload = { count: 2 };

		container.innerHTML = renderToString(
			jsx('property-receiver', {
				'prop:payload': payload,
			}),
			{ hydrate: true },
		);

		hydrate(
			jsx('property-receiver', {
				'prop:payload': payload,
			}),
			container,
		);

		const receiver = container.querySelector('property-receiver') as PropertyReceiverElement | null;
		expect(receiver?.payload).toBe(payload);
	});

	test('hydrate preserves SSR DOM when a child value is subscribable', async () => {
		const [{ createSubscribableJsxValue, jsx }, { hydrate, renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const subscribers = new Set<(value: import('../jsx-runtime.ts').JsxElement) => void>();
		let count = 2;
		const boundCount = createSubscribableJsxValue({
			getValue: () => count,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});

		const template = jsx('p', {
			class: 'component-metric',
			children: ['Count: ', boundCount],
		});

		container.innerHTML = renderToString(template, { hydrate: true });

		const paragraph = container.querySelector('p');
		expect(paragraph?.textContent).toBe('Count: 2');

		hydrate(template, container);

		expect(container.querySelector('p')).toBe(paragraph);

		count = 3;
		for (const subscriber of subscribers) {
			subscriber(count);
		}

		await Promise.resolve();

		expect(container.querySelector('p')).toBe(paragraph);
		expect(paragraph?.textContent).toBe('Count: 3');
	});

	test('hydrate does not consume hydration markers inside descendant custom-element islands', async () => {
		const [{ jsx }, { hydrate }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const outerHandler = vi.fn();

		container.innerHTML =
			'<div>' +
			'<button data-radiant-jsx-bind-0="event:click">Outer</button>' +
			'<nested-host><button data-radiant-jsx-bind-0="event:click">Island</button></nested-host>' +
			'</div>';

		hydrate(
			jsx('div', {
				children: [
					jsx('button', {
						'on:click': outerHandler,
						children: 'Outer',
					}),
					jsx('nested-host', {}),
				],
			}),
			container,
		);

		const outerButton = container.querySelector(':scope > div > button');
		const islandButton = container.querySelector('nested-host button');

		outerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		islandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(outerHandler).toHaveBeenCalledTimes(1);
		expect(islandButton?.getAttribute('data-radiant-jsx-bind-0')).toBe('event:click');
	});

	test('hydrate preserves sibling child order for nested template children', async () => {
		const [{ jsxs, jsx }, { hydrate, renderToString }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const incrementHandler = vi.fn();
		const template = jsx('section', {
			class: 'component-card component-card--context',
			children: [
				jsx('p', { class: 'component-tag', children: 'SSR context flow' }),
				jsx('h3', { children: 'Nested RadiantComponent context' }),
				jsxs('p', {
					class: 'component-copy',
					children: ['This card restores ', jsx('code', { children: 'provider context' }), ' from SSR.'],
				}),
				jsx('demo-leaf', {
					children: jsx('p', {
						class: 'component-metric',
						'data-ref': 'context-summary',
						children: 'Context: Nitro SSR context / 2',
					}),
				}),
				jsx('div', {
					class: 'component-actions',
					children: jsx('button', {
						'on:click': incrementHandler,
						type: 'button',
						children: 'Increase context level',
					}),
				}),
			],
		});

		container.innerHTML = renderToString(template, { hydrate: true });
		hydrate(template, container);

		const section = container.querySelector('section');
		const buttons = container.querySelectorAll('button');

		expect(section?.firstElementChild?.tagName).toBe('P');
		expect(section?.firstElementChild?.className).toBe('component-tag');
		expect(Array.from(buttons)).toHaveLength(1);
		expect(section?.querySelectorAll('[data-radiant-jsx-bind-]').length).toBe(0);

		buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(incrementHandler).toHaveBeenCalledTimes(1);
	});
});
