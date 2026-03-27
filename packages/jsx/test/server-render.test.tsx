import { describe, expect, test } from 'vitest';
import type { ContextProvider as RadiantContextProvider } from '../../radiant/src/context/context-provider.ts';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../jsx-runtime.ts')>('../jsx-runtime.ts');
const loadServerRender = async () => loadModule<typeof import('../server-render.ts')>('../server-render.ts');

const forceServerCustomElementRenderSymbol = Symbol.for('@ecopages/jsx.force-server-custom-element-render');

describe('Radiant JSX server render', () => {
	test('serializes intrinsic elements and escapes text content', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('div', {
			class: 'counter',
			children: 'Hello <Radiant>',
		});

		expect(renderToString(template)).toBe('<div class="counter">Hello &lt;Radiant&gt;</div>');
	});

	test('serializes nested components and iterable children', async () => {
		const [{ jsx, jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		const Label = ({ text }: { text: string }) => jsx('strong', { children: text });
		const Card = ({ title, children }: { title: string; children: import('../jsx-runtime.ts').JsxRenderable }) =>
			jsxs('section', {
				children: ['Hello ', jsx(Label, { text: title }), ' ', children],
			});

		const template = jsx(Card, {
			title: 'SSR',
			children: [jsx('span', { children: 'ready' }), '!'],
		});

		expect(renderToString(template)).toBe('<section>Hello <strong>SSR</strong> <span>ready</span>!</section>');
	});

	test('serializes very nested mixed trees without leaking wrapper artifacts', async () => {
		const [{ jsx, jsxs, createSubscribableJsxValue }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadServerRender(),
		]);

		const DeepLeaf = ({ value }: { value: string }) => jsx('em', { children: value });
		const NestedBlock = ({
			title,
			children,
		}: {
			title: string;
			children: import('../jsx-runtime.ts').JsxRenderable;
		}) =>
			jsxs('article', {
				class: 'nested-block',
				children: [jsx('h2', { children: title }), jsx('div', { class: 'nested-children', children })],
			});

		const dynamicLabel = createSubscribableJsxValue({
			getValue: () => 'deep-ready',
			subscribe: () => () => undefined,
		});

		const template = jsx(NestedBlock, {
			title: 'Outer',
			children: [
				jsxs('section', {
					children: [
						'Level 1 ',
						jsx('span', { children: ['Level 2 ', jsx(DeepLeaf, { value: 'Level 3' })] }),
						jsx('footer', {
							children: ['Label: ', dynamicLabel, [' / ', jsx('strong', { children: 'done' })]],
						}),
					],
				}),
			],
		});

		const html = renderToString(template, { hydrate: true });

		expect(html).toContain('class="nested-block"');
		expect(html).toContain('<h2>Outer</h2>');
		expect(html).toContain('Level 1 <span>Level 2 <em>Level 3</em></span>');
		expect(html).toContain('<footer>Label: deep-ready / <strong>done</strong></footer>');
		expect(html).not.toContain('[object Object]');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test('serializes standard, boolean, style, data, and aria attributes', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('button', {
			hidden: true,
			style: { backgroundColor: 'tomato', paddingInline: '12px' },
			data: { tid: 'counter' },
			aria: { label: 'Increment' },
			children: '+',
		});

		expect(renderToString(template)).toBe(
			'<button hidden style="background-color: tomato; padding-inline: 12px" data-tid="counter" aria-label="Increment">+</button>',
		);
	});

	test('escapes text and attribute values with a single-pass HTML encoder', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('div', {
			title: '5 > 4 & "quoted" < 9',
			children: 'Use <strong>carefully</strong> & stay safe',
		});

		expect(renderToString(template)).toBe(
			'<div title="5 &gt; 4 &amp; &quot;quoted&quot; &lt; 9">Use &lt;strong&gt;carefully&lt;/strong&gt; &amp; stay safe</div>',
		);
	});

	test('omits event and property bindings from serialized HTML', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('demo-card', {
			'on:click': () => undefined,
			'prop:payload': { count: 2 },
			title: 'Ready',
		});

		expect(renderToString(template)).toBe('<demo-card title="Ready"></demo-card>');
	});

	test('serializes void elements without closing tags', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('input', {
			type: 'text',
			value: 'hello',
		});

		expect(renderToString(template)).toBe('<input type="text" value="hello">');
	});

	test('preserves hydration markers when requested', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('button', {
			class: 'action',
			hidden: true,
			'on:click': () => undefined,
			children: 'Ship',
		});

		expect(renderToString(template, { hydrate: true })).toBe(
			'<button data-radiant-jsx-bind-0="attr:class" class="action" data-radiant-jsx-bind-1="bool:hidden" hidden data-radiant-jsx-bind-2="event:click">Ship</button>',
		);
	});

	test('does not serialize internal child markers for mixed sibling content', async () => {
		const [{ jsx, jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsxs('p', {
			class: 'component-copy',
			children: [
				'This card uses the new ',
				jsx('code', { children: 'render()' }),
				' + ',
				jsx('code', { children: 'update()' }),
				' flow instead of manual ',
				jsx('code', { children: 'render(template)' }),
				' calls.',
			],
		});

		const html = renderToString(template, { hydrate: true });

		expect(html).toContain('class="component-copy"');
		expect(html).toContain(
			'This card uses the new <code>render()</code> + <code>update()</code> flow instead of manual',
		);
		expect(html).toContain('<code>render(template)</code> calls.');
		expect(html).not.toContain('radiant-jsx-child-start');
		expect(html).not.toContain('radiant-jsx-child-end');
	});

	test('treats keyed JSX values as transparent during server rendering', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('ul', {
			children: [jsx('li', { children: 'alpha', key: 'a' }), jsx('li', { children: 'beta', key: 'b' })],
		});

		expect(renderToString(template)).toBe('<ul><li>alpha</li><li>beta</li></ul>');
	});

	test('serializes subscribable JSX child values from their current value', async () => {
		const [{ createSubscribableJsxValue, jsx }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadServerRender(),
		]);
		let count = 28;
		const boundCount = createSubscribableJsxValue({
			getValue: () => count,
			subscribe: () => () => undefined,
		});
		const template = jsx('p', {
			class: 'component-metric',
			children: ['Count: ', boundCount],
		});

		expect(renderToString(template)).toBe('<p class="component-metric">Count: 28</p>');

		count = 29;
		expect(renderToString(template)).toBe('<p class="component-metric">Count: 29</p>');
	});

	test('serializes registered SSR-capable custom elements from plain intrinsic tags', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		class MinimalServerElement extends EventTarget {
			private attributes = new Map<string, string>();
			count = 0;
			label = 'Counter';

			setAttribute(name: string, value: unknown) {
				this.attributes.set(name, String(value));
			}

			removeAttribute(name: string) {
				this.attributes.delete(name);
			}

			renderHostToString() {
				return `<demo-counter count="${this.count}" label="${this.label}"><p>Count: ${this.count}</p><h3>${this.label}</h3></demo-counter>`;
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];

		Object.defineProperty(globalThis, 'customElements', {
			configurable: true,
			value: {
				get(name: string) {
					return name === 'demo-counter'
						? (MinimalServerElement as unknown as CustomElementConstructor)
						: undefined;
				},
			},
		});

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const template = jsx('demo-counter', {
				count: 2,
				label: 'SSR ready',
			});

			expect(renderToString(template)).toBe(
				'<demo-counter count="2" label="SSR ready"><p>Count: 2</p><h3>SSR ready</h3></demo-counter>',
			);
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'customElements');
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

	test('respects the caller hydrate mode for SSR-capable intrinsic custom elements', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		class HydrationAwareElement extends EventTarget {
			setAttribute(_name: string, _value: unknown) {}
			removeAttribute(_name: string) {}

			renderHostToString(options?: { hydrate?: boolean }) {
				return options?.hydrate
					? '<demo-hydration-aware data-hydrated="yes"><p>Hydrated host</p></demo-hydration-aware>'
					: '<demo-hydration-aware><p>Plain host</p></demo-hydration-aware>';
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];

		Object.defineProperty(globalThis, 'customElements', {
			configurable: true,
			value: {
				get(name: string) {
					return name === 'demo-hydration-aware'
						? (HydrationAwareElement as unknown as CustomElementConstructor)
						: undefined;
				},
			},
		});

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const template = jsx('demo-hydration-aware', {});

			expect(renderToString(template)).toBe('<demo-hydration-aware><p>Plain host</p></demo-hydration-aware>');
			expect(renderToString(template, { hydrate: true })).toBe(
				'<demo-hydration-aware data-hydrated="yes"><p>Hydrated host</p></demo-hydration-aware>',
			);
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'customElements');
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

	test('serializes nested SSR-capable custom elements from plain intrinsic tags', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		class DemoPanelElement extends EventTarget {
			headline = 'Nested shell';

			setAttribute(_name: string, _value: unknown) {}
			removeAttribute(_name: string) {}

			renderHostToString() {
				return `<demo-panel headline="${this.headline}"><section><h2>${this.headline}</h2><slot></slot></section></demo-panel>`;
			}
		}

		class DemoCounterElement extends EventTarget {
			count = 0;

			setAttribute(_name: string, _value: unknown) {}
			removeAttribute(_name: string) {}

			renderHostToString() {
				return `<demo-counter count="${this.count}"><p>Count: ${this.count}</p></demo-counter>`;
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const forceServerCustomElementRenderSymbol = Symbol.for('@ecopages/jsx.force-server-custom-element-render');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];

		Object.defineProperty(globalThis, 'customElements', {
			configurable: true,
			value: {
				get(name: string) {
					if (name === 'demo-panel') return DemoPanelElement as unknown as CustomElementConstructor;
					if (name === 'demo-counter') return DemoCounterElement as unknown as CustomElementConstructor;
					return undefined;
				},
			},
		});

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const template = jsx('section', {
				children: [jsx('demo-panel', { headline: 'Nested shell' }), jsx('demo-counter', { count: 9 })],
			});

			const html = renderToString(template);

			expect(html).toContain(
				'<demo-panel headline="Nested shell"><section><h2>Nested shell</h2><slot></slot></section></demo-panel>',
			);
			expect(html).toContain('<demo-counter count="9"><p>Count: 9</p></demo-counter>');
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'customElements');
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

	test('serializes light DOM children into SSR-capable intrinsic custom elements', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		class DemoPanelElement extends EventTarget {
			headline = 'Nested shell';
			children = '';

			setAttribute(_name: string, _value: unknown) {}
			removeAttribute(_name: string) {}

			renderHostToString() {
				return `<demo-panel headline="${this.headline}"><section><h2>${this.headline}</h2>${this.children}</section></demo-panel>`;
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const forceServerCustomElementRenderSymbol = Symbol.for('@ecopages/jsx.force-server-custom-element-render');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];

		Object.defineProperty(globalThis, 'customElements', {
			configurable: true,
			value: {
				get(name: string) {
					return name === 'demo-panel'
						? (DemoPanelElement as unknown as CustomElementConstructor)
						: undefined;
				},
			},
		});

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const template = jsx('demo-panel', {
				headline: 'Nested shell',
				children: jsx('p', { children: 'Projected child' }),
			});

			expect(renderToString(template)).toBe(
				'<demo-panel headline="Nested shell"><section><h2>Nested shell</h2><p>Projected child</p></section></demo-panel>',
			);
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'customElements');
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

	test('suppresses boolean true children inside SSR-capable intrinsic custom elements', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		class DemoBooleanPanelElement extends EventTarget {
			children = '';

			setAttribute(_name: string, _value: unknown) {}
			removeAttribute(_name: string) {}

			renderHostToString() {
				return `<demo-boolean-panel>${this.children}</demo-boolean-panel>`;
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];

		Object.defineProperty(globalThis, 'customElements', {
			configurable: true,
			value: {
				get(name: string) {
					return name === 'demo-boolean-panel'
						? (DemoBooleanPanelElement as unknown as CustomElementConstructor)
						: undefined;
				},
			},
		});

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const template = jsx('demo-boolean-panel', {
				children: [true, 'Visible child'],
			});

			expect(renderToString(template)).toBe('<demo-boolean-panel>Visible child</demo-boolean-panel>');
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'customElements');
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

	test('serializes SSR-capable intrinsic custom-element children without the Node global', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		class DemoFallbackPanelElement extends EventTarget {
			children = '';

			setAttribute(_name: string, _value: unknown) {}
			removeAttribute(_name: string) {}

			renderHostToString() {
				return `<demo-fallback-panel>${this.children}</demo-fallback-panel>`;
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const previousNodeDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Node');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];

		Object.defineProperty(globalThis, 'customElements', {
			configurable: true,
			value: {
				get(name: string) {
					return name === 'demo-fallback-panel'
						? (DemoFallbackPanelElement as unknown as CustomElementConstructor)
						: undefined;
				},
			},
		});

		Object.defineProperty(globalThis, 'Node', {
			configurable: true,
			value: undefined,
		});

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const template = jsx('demo-fallback-panel', {
				children: {
					toString: () => 'Fallback object',
				} as unknown as import('../jsx-runtime.ts').JsxRenderable,
			});

			expect(renderToString(template)).toBe('<demo-fallback-panel>Fallback object</demo-fallback-panel>');
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'customElements');
			}

			if (previousNodeDescriptor) {
				Object.defineProperty(globalThis, 'Node', previousNodeDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'Node');
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

	test('serializes nested RadiantComponent hosts from plain intrinsic tags', async () => {
		const [
			{ jsx },
			{ renderToString },
			{ ContextProvider },
			{ createContext },
			{ RadiantComponent },
			{ resolveSsrContextValue },
			{ setCustomElementTagName },
		] = await Promise.all([
			loadJsxRuntime(),
			loadServerRender(),
			loadModule<typeof import('../../radiant/src/context/context-provider.ts')>(
				'../../radiant/src/context/context-provider.ts',
			),
			loadModule<typeof import('../../radiant/src/context/create-context.ts')>(
				'../../radiant/src/context/create-context.ts',
			),
			loadModule<typeof import('../../radiant/src/core/radiant-component.ts')>(
				'../../radiant/src/core/radiant-component.ts',
			),
			loadModule<typeof import('../../radiant/src/context/context-ssr.ts')>(
				'../../radiant/src/context/context-ssr.ts',
			),
			loadModule<typeof import('../../radiant/src/core/custom-element-metadata.ts')>(
				'../../radiant/src/core/custom-element-metadata.ts',
			),
		]);

		const nestedContext = createContext<{ label: string; level: number }>(Symbol('nested-radiant-context'));

		class NestedRadiantChild extends RadiantComponent {
			override render() {
				const context = resolveSsrContextValue(nestedContext);
				const summary = context ? `${context.label} / ${context.level}` : 'Pending context';

				return jsx('section', {
					class: 'nested-child-card',
					children: [
						jsx('h3', { children: 'Nested child SSR' }),
						jsx('p', { children: ['Context: ', jsx('strong', { children: summary })] }),
					],
				});
			}
		}

		class NestedRadiantParent extends RadiantComponent {
			declare context: RadiantContextProvider<typeof nestedContext>;

			constructor() {
				super();
				this.context = new ContextProvider(this, {
					context: nestedContext,
					hydrationKey: 'context',
					initialValue: { label: 'Nitro SSR context', level: 2 },
					hydrate: Object,
				});
				this.registerContextProvider('context', this.context);
			}

			override render() {
				return jsx('section', {
					class: 'nested-parent-shell',
					children: [
						jsx('header', { children: jsx('h2', { children: 'Parent shell' }) }),
						jsx(childTagName, {}),
					],
				});
			}
		}

		const previousCustomElementsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
		const registry = globalThis.customElements;
		const forceServerCustomElementRenderSymbol = Symbol.for('@ecopages/jsx.force-server-custom-element-render');
		const previousForceServerCustomElementRender = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
			forceServerCustomElementRenderSymbol
		];
		const tagSuffix = Math.random().toString(36).slice(2);
		const childTagName = `nested-radiant-child-test-${tagSuffix}`;
		const parentTagName = `nested-radiant-parent-test-${tagSuffix}`;

		setCustomElementTagName(NestedRadiantChild, childTagName);
		setCustomElementTagName(NestedRadiantParent, parentTagName);

		if (!registry.get(childTagName)) {
			registry.define(childTagName, NestedRadiantChild as unknown as CustomElementConstructor);
		}

		if (!registry.get(parentTagName)) {
			registry.define(parentTagName, NestedRadiantParent as unknown as CustomElementConstructor);
		}

		(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] = true;

		try {
			const parent = new NestedRadiantParent();
			const nestedHtml = renderToString(jsx(parentTagName, {}), {
				hydrate: true,
			});

			expect(nestedHtml).toContain(`<${parentTagName}>`);
			expect(nestedHtml).toContain(`<${childTagName}>`);
			expect(nestedHtml).toContain('class="nested-child-card"');
			expect(nestedHtml).toContain('<h3>Nested child SSR</h3>');
			expect(nestedHtml).toContain('<p>Context: <strong>Nitro SSR context / 2</strong></p>');
			expect(nestedHtml).toContain('<script type="application/json" data-hydration data-context-key="context">');
			expect(nestedHtml).toContain('{"label":"Nitro SSR context","level":2}');

			const parentHostHtml = parent.renderHostToString({ hydrate: true });

			expect(parentHostHtml).toContain(`<${parentTagName}>`);
			expect(parentHostHtml).toContain(`<${childTagName}>`);
			expect(parentHostHtml).toContain('class="nested-child-card"');
			expect(parentHostHtml).toContain('<h3>Nested child SSR</h3>');
			expect(parentHostHtml).toContain('<p>Context: <strong>Nitro SSR context / 2</strong></p>');
			expect(parentHostHtml).toContain(
				'<script type="application/json" data-hydration data-context-key="context">',
			);
		} finally {
			if (previousCustomElementsDescriptor) {
				Object.defineProperty(globalThis, 'customElements', previousCustomElementsDescriptor);
			}

			if (previousForceServerCustomElementRender === undefined) {
				delete (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
					forceServerCustomElementRenderSymbol
				];
			} else {
				(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[forceServerCustomElementRenderSymbol] =
					previousForceServerCustomElementRender;
			}
		}
	});

});
