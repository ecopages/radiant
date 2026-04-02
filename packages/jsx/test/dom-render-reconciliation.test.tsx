import { beforeEach, describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../jsx-runtime.ts')>('../jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../index.ts')>('../index.ts');
const loadServerRender = async () => loadModule<typeof import('../server-render.ts')>('../server-render.ts');

describe('Radiant JSX DOM reconciliation behavior', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('rerender patches an existing template instance when the shape is stable', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderCard = (label: string) =>
			jsx('section', {
				children: jsx('button', {
					children: label,
					id: 'action',
				}),
			});

		root.render(renderCard('alpha'));

		const initialSection = container.querySelector('section');
		const initialButton = container.querySelector('button');
		expect(initialButton?.textContent).toBe('alpha');

		root.render(renderCard('beta'));

		const rerenderedSection = container.querySelector('section');
		const rerenderedButton = container.querySelector('button');
		expect(rerenderedButton?.textContent).toBe('beta');
		expect(rerenderedSection).toBe(initialSection);
		expect(rerenderedButton).toBe(initialButton);
	});

	test('reorders keyed iterable children without recreating their DOM nodes', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value, key: value })),
			});

		root.render(renderList(['alpha', 'beta', 'gamma']));

		const initialItems = Array.from(container.querySelectorAll('li'));
		expect(initialItems.map((item) => item.textContent)).toEqual(['alpha', 'beta', 'gamma']);

		root.render(renderList(['gamma', 'alpha', 'beta']));

		const rerenderedItems = Array.from(container.querySelectorAll('li'));
		expect(rerenderedItems.map((item) => item.textContent)).toEqual(['gamma', 'alpha', 'beta']);
		expect(rerenderedItems[0]).toBe(initialItems[2]);
		expect(rerenderedItems[1]).toBe(initialItems[0]);
		expect(rerenderedItems[2]).toBe(initialItems[1]);
	});

	test('reorders unkeyed iterable children by patching positions in place', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value })),
			});

		root.render(renderList(['alpha', 'beta', 'gamma']));

		const initialItems = Array.from(container.querySelectorAll('li'));
		expect(initialItems.map((item) => item.textContent)).toEqual(['alpha', 'beta', 'gamma']);

		root.render(renderList(['gamma', 'alpha', 'beta']));

		const rerenderedItems = Array.from(container.querySelectorAll('li'));
		expect(rerenderedItems.map((item) => item.textContent)).toEqual(['gamma', 'alpha', 'beta']);
		expect(rerenderedItems[0]).toBe(initialItems[0]);
		expect(rerenderedItems[1]).toBe(initialItems[1]);
		expect(rerenderedItems[2]).toBe(initialItems[2]);
	});

	test('preserves unkeyed iterable positions across append and truncate updates', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value })),
			});

		root.render(renderList(['alpha', 'beta']));

		const initialItems = Array.from(container.querySelectorAll('li'));
		const alphaItem = initialItems[0];
		const betaItem = initialItems[1];

		root.render(renderList(['alpha updated', 'beta updated', 'gamma']));

		const expandedItems = Array.from(container.querySelectorAll('li'));
		expect(expandedItems.map((item) => item.textContent)).toEqual(['alpha updated', 'beta updated', 'gamma']);
		expect(expandedItems[0]).toBe(alphaItem);
		expect(expandedItems[1]).toBe(betaItem);

		root.render(renderList(['final alpha']));

		const truncatedItems = Array.from(container.querySelectorAll('li'));
		expect(truncatedItems.map((item) => item.textContent)).toEqual(['final alpha']);
		expect(truncatedItems[0]).toBe(alphaItem);
	});

	test('preserves keyed DOM nodes across insertions and removals', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value, key: value })),
			});

		root.render(renderList(['alpha', 'beta']));

		const initialItems = Array.from(container.querySelectorAll('li'));
		const alphaItem = initialItems[0];
		const betaItem = initialItems[1];

		root.render(renderList(['beta', 'gamma', 'alpha']));

		const insertedItems = Array.from(container.querySelectorAll('li'));
		expect(insertedItems.map((item) => item.textContent)).toEqual(['beta', 'gamma', 'alpha']);
		expect(insertedItems[0]).toBe(betaItem);
		expect(insertedItems[2]).toBe(alphaItem);

		root.render(renderList(['gamma', 'alpha']));

		const finalItems = Array.from(container.querySelectorAll('li'));
		expect(finalItems.map((item) => item.textContent)).toEqual(['gamma', 'alpha']);
		expect(finalItems[1]).toBe(alphaItem);
		expect(finalItems).not.toContain(betaItem);
	});

	test('replaces keyed ranges cleanly when switching back to non-keyed children', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderKeyedList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value, key: value })),
			});

		const renderPlainList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value })),
			});

		root.render(renderKeyedList(['alpha', 'beta']));
		const keyedItems = Array.from(container.querySelectorAll('li'));

		root.render(renderPlainList(['plain', 'list']));

		const plainItems = Array.from(container.querySelectorAll('li'));
		expect(plainItems.map((item) => item.textContent)).toEqual(['plain', 'list']);
		expect(plainItems[0]).not.toBe(keyedItems[0]);
		expect(plainItems[1]).not.toBe(keyedItems[1]);
		expect(container.innerHTML).not.toContain('radiant-jsx-child-start:keyed');
		expect(container.innerHTML).not.toContain('radiant-jsx-child-end:keyed');
	});

	test('keeps internal child anchors out of rendered DOM for mixed content updates', async () => {
		const [{ jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderCounter = (count: number) =>
			jsxs('p', {
				class: 'component-metric',
				children: ['Count: ', count],
			});

		root.render(renderCounter(15));
		expect(container.innerHTML).toBe('<p class="component-metric">Count: 15</p>');
		expect(container.innerHTML).not.toContain('radiant-jsx-child-start');
		expect(container.innerHTML).not.toContain('radiant-jsx-child-end');

		root.render(renderCounter(16));
		expect(container.innerHTML).toBe('<p class="component-metric">Count: 16</p>');
		expect(container.innerHTML).not.toContain('radiant-jsx-child-start');
		expect(container.innerHTML).not.toContain('radiant-jsx-child-end');
	});

	test('treats true child values as empty content during DOM rendering', async () => {
		const [{ jsx }, { createRoot, renderToString }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const template = jsx('p', {
			children: ['Before', true, 'After'],
		});

		root.render(template);

		expect(container.querySelector('p')?.textContent).toBe('BeforeAfter');
		expect(container.innerHTML).toBe(renderToString(template));
	});

	test('mounts SVG child templates with SVG namespaces under SVG parents', async () => {
		const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx('button', {
				children: jsxs('svg', {
					viewBox: '0 0 24 24',
					children: [jsx('path', { d: 'M18 6 6 18' }), jsx('path', { d: 'm6 6 12 12' })],
				}),
			}),
		);

		const svg = container.querySelector('svg');
		const paths = Array.from(container.querySelectorAll('path'));

		expect(svg?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(paths).toHaveLength(2);
		expect(paths.every((path) => path.namespaceURI === 'http://www.w3.org/2000/svg')).toBe(true);
		expect(paths.every((path) => path instanceof SVGElement)).toBe(true);
	});

	test('preserves namespaced SVG attributes across mount and update', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const xlinkNamespace = 'http://www.w3.org/1999/xlink';

		const renderIconUse = (href: string) =>
			jsx('svg', {
				children: jsx('use', {
					'xlink:href': href,
				}),
			});

		root.render(renderIconUse('#alpha'));

		const initialUse = container.querySelector('use');

		expect(initialUse?.getAttributeNS(xlinkNamespace, 'href')).toBe('#alpha');

		root.render(renderIconUse('#beta'));

		const updatedUse = container.querySelector('use');

		expect(updatedUse).toBe(initialUse);
		expect(updatedUse?.getAttributeNS(xlinkNamespace, 'href')).toBe('#beta');
	});

	test('switches SVG children back to HTML inside foreignObject', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx('svg', {
				children: jsx('foreignObject', {
					children: jsx('button', {
						class: 'foreign-object-action',
						children: 'Launch',
					}),
				}),
			}),
		);

		const button = container.querySelector('.foreign-object-action');

		expect(button?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(button instanceof HTMLButtonElement).toBe(true);
	});

	test('hydrates nested SVG content with preserved namespaces and updates', async () => {
		const [{ jsx, jsxs }, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const xlinkNamespace = 'http://www.w3.org/1999/xlink';

		const renderHydratedIcon = (href: string) =>
			jsx('button', {
				children: jsxs('svg', {
					viewBox: '0 0 24 24',
					children: [
						jsx('use', { 'xlink:href': href }),
						jsx('path', { d: 'M18 6 6 18' }),
						jsx('foreignObject', {
							children: jsx('span', { class: 'foreign-object-label', children: 'HTML' }),
						}),
					],
				}),
			});

		container.innerHTML = renderToString(renderHydratedIcon('#alpha'), { hydrate: true });
		root.hydrate(renderHydratedIcon('#alpha'));

		const hydratedUse = container.querySelector('use');
		const hydratedPath = container.querySelector('path');
		const hydratedForeignObjectLabel = container.querySelector('.foreign-object-label');

		expect(hydratedUse?.getAttributeNS(xlinkNamespace, 'href')).toBe('#alpha');
		expect(hydratedPath?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(hydratedPath instanceof SVGElement).toBe(true);
		expect(hydratedForeignObjectLabel?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(hydratedForeignObjectLabel instanceof HTMLSpanElement).toBe(true);

		root.render(renderHydratedIcon('#beta'));

		expect(container.querySelector('use')).toBe(hydratedUse);
		expect(container.querySelector('use')?.getAttributeNS(xlinkNamespace, 'href')).toBe('#beta');
		expect(container.querySelector('path')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(container.querySelector('.foreign-object-label')?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	});

	test('hydrates iterable-root SSR bindings through the fallback marker scan', async () => {
		const [{ jsx }, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let clickTotal = 0;
		const incrementAlpha = () => {
			clickTotal += 1;
		};
		const incrementBeta = () => {
			clickTotal += 10;
		};
		const renderIterableRoot = () => [
			jsx('button', {
				'on:click': incrementAlpha,
				children: 'Alpha',
			}),
			jsx('button', {
				'on:click': incrementBeta,
				children: 'Beta',
			}),
		];

		container.innerHTML = renderToString(renderIterableRoot(), { hydrate: true });
		root.hydrate(renderIterableRoot());

		const buttons = Array.from(container.querySelectorAll('button'));
		buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(clickTotal).toBe(11);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
	});

	test('does not lose generator children when keyed detection falls back to indexed mode', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		function* children() {
			yield jsx('li', { children: 'alpha', key: 'alpha' });
			yield jsx('li', { children: 'beta' });
			yield jsx('li', { children: 'gamma' });
		}

		root.render(
			jsx('ul', {
				children: children(),
			}),
		);

		expect(Array.from(container.querySelectorAll('li')).map((item) => item.textContent)).toEqual([
			'alpha',
			'beta',
			'gamma',
		]);
	});

	test('counter-style updates only mutate the reactive text node', async () => {
		const [{ jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderCounterCard = (count: number) =>
			jsxs('section', {
				class: 'component-card component-card--counter',
				children: [
					jsxs('p', { class: 'component-tag', children: ['RadiantComponent'] }),
					jsxs('h3', { children: ['SSR counter rendered in Nitro'] }),
					jsxs('p', {
						class: 'component-copy',
						children: [
							'This card uses the new ',
							jsxs('code', { children: ['render()'] }),
							' + ',
							jsxs('code', { children: ['update()'] }),
							' flow instead of manual ',
							jsxs('code', { children: ['render(template)'] }),
							' calls.',
						],
					}),
					jsxs('p', { class: 'component-metric', children: ['Count: ', count] }),
				],
			});

		root.render(renderCounterCard(15));

		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});

		observer.observe(container, {
			characterData: true,
			characterDataOldValue: true,
			childList: true,
			subtree: true,
		});

		root.render(renderCounterCard(16));
		await Promise.resolve();
		observer.disconnect();

		expect(container.innerHTML).toContain('<p class="component-metric">Count: 16</p>');
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('15');
	});

	test('subscribable child values patch their own text node without rerendering the parent tree', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: number) => void>();
		let count = 15;
		const boundCount = createSubscribableJsxValue({
			getValue: () => count,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});

		root.render(
			jsxs('p', {
				class: 'component-metric',
				children: ['Count: ', boundCount],
			}),
		);

		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});

		observer.observe(container, {
			characterData: true,
			characterDataOldValue: true,
			childList: true,
			subtree: true,
		});

		count = 16;

		for (const subscriber of subscribers) {
			subscriber(count);
		}

		await Promise.resolve();
		observer.disconnect();

		expect(container.innerHTML).toBe('<p class="component-metric">Count: 16</p>');
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('15');
	});

	test('signal-like child values patch their own text node without rerendering the parent tree', async () => {
		const [{ jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: number) => void>();
		let count = 3;
		const boundCount = {
			get: () => count,
			subscribe: (notify: (value: number) => void) => {
				subscribers.add(notify);

				return () => {
					subscribers.delete(notify);
				};
			},
		};

		root.render(
			jsxs('p', {
				class: 'component-metric',
				children: ['Signal count: ', boundCount],
			}),
		);

		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});

		observer.observe(container, {
			characterData: true,
			characterDataOldValue: true,
			childList: true,
			subtree: true,
		});

		count = 4;

		for (const subscriber of subscribers) {
			subscriber(count);
		}

		await Promise.resolve();
		observer.disconnect();

		expect(container.innerHTML).toBe('<p class="component-metric">Signal count: 4</p>');
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('3');
	});

	test('signal-like attribute values patch attributes without rerendering the parent tree', async () => {
		const [{ jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const statusSubscribers = new Set<(value: string) => void>();
		const loadingSubscribers = new Set<(value: boolean) => void>();
		let status = 'idle';
		let loading = false;
		const statusSignal = {
			get: () => status,
			subscribe: (notify: (value: string) => void) => {
				statusSubscribers.add(notify);
				return () => {
					statusSubscribers.delete(notify);
				};
			},
		};
		const loadingSignal = {
			get: () => loading,
			subscribe: (notify: (value: boolean) => void) => {
				loadingSubscribers.add(notify);
				return () => {
					loadingSubscribers.delete(notify);
				};
			},
		};

		root.render(
			jsxs('button', {
				class: 'fetch-button',
				'aria-busy': loadingSignal,
				data: { status: statusSignal },
				disabled: loadingSignal,
				children: ['Fetch'],
			}),
		);

		const button = container.querySelector('button');
		expect(button?.getAttribute('data-status')).toBe('idle');
		expect(button?.hasAttribute('disabled')).toBe(false);

		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});

		observer.observe(container, {
			attributes: true,
			childList: true,
			subtree: true,
		});

		status = 'loading';
		loading = true;

		for (const subscriber of statusSubscribers) {
			subscriber(status);
		}

		for (const subscriber of loadingSubscribers) {
			subscriber(loading);
		}

		await Promise.resolve();
		observer.disconnect();

		expect(button?.getAttribute('data-status')).toBe('loading');
		expect(button?.getAttribute('aria-busy')).toBe('true');
		expect(button?.hasAttribute('disabled')).toBe(true);
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'attributes').length).toBeGreaterThanOrEqual(2);
	});

	test('rerender preserves focus without calling setSelectionRange on checkbox inputs', async () => {
		const [{ jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		const renderForm = (checked: boolean) =>
			jsxs('label', {
				children: [
					jsxs('span', {
						children: ['Checked: ', checked ? 'yes' : 'no'],
					}),
					jsxs('input', {
						type: 'checkbox',
						checked,
					}),
				],
			});

		root.render(renderForm(false));

		const checkbox = container.querySelector('input');
		checkbox?.focus();

		expect(() => {
			root.render(renderForm(true));
		}).not.toThrow();
		expect((container.querySelector('input') as HTMLInputElement | null)?.checked).toBe(true);
	});
});
