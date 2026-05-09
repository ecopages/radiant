import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

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

function defineInteropElement(): void {
	if (customElements.get(tagName)) {
		return;
	}

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
}

describe('Radiant JSX custom-element interop', () => {
	beforeAll(() => {
		defineInteropElement();
	});

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
