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
});
