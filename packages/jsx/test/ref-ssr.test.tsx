import { describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadServerRender = async () =>
	loadModule<typeof import('../src/ssr/server-render.ts')>('../src/ssr/server-render.ts');

const forceServerCustomElementRenderSymbol = Symbol.for('@ecopages/jsx.force-server-custom-element-render');

const refCallback = function refCallbackSource() {
	return undefined;
};

describe('JSX ref on the server', () => {
	test.each(['plain', 'hydrate'] as const)(
		'%s mode never writes the ref or its source on native elements',
		async (mode) => {
			const [{ jsx, jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

			const html = renderToString(
				jsxs('form', {
					children: [
						jsx('input', { class: 'field', ref: refCallback }),
						jsx('svg', { ref: refCallback }),
						jsx('unregistered-host', { ref: refCallback, title: 'x' }),
					],
				}),
				{ mode },
			);

			expect(html).not.toContain('refCallbackSource');
			expect(html).not.toContain('function');
			expect(html).not.toMatch(/\sref=/);
			expect(html).toContain('class="field"');
			expect(html).toContain('title="x"');

			if (mode === 'plain') expect(html).not.toContain('data-radiant-jsx-bind');
		},
	);

	test('hydrate mode marks the element with a descriptor that holds no function', async () => {
		const [{ jsx, jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		const html = renderToString(
			jsxs('div', { children: [jsx('input', { ref: refCallback }), jsx('button', { id: 'go' })] }),
			{ mode: 'hydrate' },
		);

		expect(html).toBe(
			'<div><input data-radiant-jsx-bind-0="ref:ref"><button data-radiant-jsx-bind-1="attr:id" id="go"></button></div>',
		);
	});

	test.each(['plain', 'hydrate'] as const)(
		'%s mode does not assign ref to a server-rendered custom element',
		async (mode) => {
			const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
			const assigned: unknown[] = [];

			class RefElement {
				attributes = new Map<string, string>();

				set ref(value: unknown) {
					assigned.push(value);
				}

				setAttribute(name: string, value: unknown) {
					this.attributes.set(name, String(value));
				}

				removeAttribute(name: string) {
					this.attributes.delete(name);
				}

				renderHostToString() {
					return `<ref-element title="${this.attributes.get('title') ?? ''}"></ref-element>`;
				}
			}

			const previousCustomElements = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
			const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
			const previousForce = globalScope[forceServerCustomElementRenderSymbol];

			Object.defineProperty(globalThis, 'customElements', {
				configurable: true,
				value: {
					get: (name: string) =>
						name === 'ref-element' ? (RefElement as unknown as CustomElementConstructor) : undefined,
				},
			});
			globalScope[forceServerCustomElementRenderSymbol] = true;

			try {
				const html = renderToString(jsx('ref-element', { ref: refCallback, title: 'x' }), { mode });

				expect(html).toBe('<ref-element title="x"></ref-element>');
				expect(assigned).toEqual([]);
			} finally {
				if (previousCustomElements) Object.defineProperty(globalThis, 'customElements', previousCustomElements);
				else Reflect.deleteProperty(globalThis, 'customElements');

				if (previousForce === undefined) delete globalScope[forceServerCustomElementRenderSymbol];
				else globalScope[forceServerCustomElementRenderSymbol] = previousForce;
			}
		},
	);

	test('a function component receives ref as an ordinary prop', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const seen: unknown[] = [];
		const Field = (props: { ref?: unknown }) => {
			seen.push(props.ref);
			return jsx('input', {});
		};

		renderToString(jsx(Field, { ref: refCallback }));

		expect(seen).toEqual([refCallback]);
	});
});
