import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	HYDRATE_ADJACENT_FIELDS_HTML,
	HYDRATE_BUTTON_ALPHA_HTML,
	HYDRATE_CARD_ALPHA_HTML,
	HYDRATE_DYNAMIC_LIST_HTML,
	HYDRATE_FRAGMENT_COUNTER_HTML,
	HYDRATE_GRADIENT_ICON_HTML,
	HYDRATE_ITERABLE_ROOT_HTML,
	HYDRATE_ITERABLE_ROOT_SINGLE_HTML,
	HYDRATE_METRIC_HTML,
	HYDRATE_NESTED_SVG_ICON_HTML,
	PLAIN_BUTTON_ALPHA_HTML,
	TRUE_CHILDREN_HTML,
} from './fixtures/hydrate-html.ts';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');
const loadJsxDevRuntime = async () =>
	loadModule<typeof import('../src/jsx-dev-runtime.ts')>('../src/jsx-dev-runtime.ts');

const booleanPropertyTagName = 'radiant-jsx-boolean-property-element';

class BooleanPropertyElement extends HTMLElement {
	enabled = true;
}

customElements.define(booleanPropertyTagName, BooleanPropertyElement);

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

	test('reorders keyed iterable children from the automatic-runtime key argument', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderList = (values: string[]) =>
			jsx('ul', {
				children: values.map((value) => jsx('li', { children: value }, value)),
			});

		root.render(renderList(['alpha', 'beta']));

		const initialItems = Array.from(container.querySelectorAll('li'));
		expect(initialItems.map((item) => item.textContent)).toEqual(['alpha', 'beta']);

		root.render(renderList(['beta', 'alpha']));

		const rerenderedItems = Array.from(container.querySelectorAll('li'));
		expect(rerenderedItems.map((item) => item.textContent)).toEqual(['beta', 'alpha']);
		expect(rerenderedItems[0]).toBe(initialItems[1]);
		expect(rerenderedItems[1]).toBe(initialItems[0]);
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
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const template = jsx('p', {
			children: ['Before', true, 'After'],
		});

		root.render(template);

		expect(container.querySelector('p')?.textContent).toBe('BeforeAfter');
		expect(container.innerHTML).toBe(TRUE_CHILDREN_HTML);
	});

	test('nullish children remove existing child content', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(jsx('p', { children: 'alpha' }));
		const paragraph = container.querySelector('p');
		expect(paragraph?.textContent).toBe('alpha');

		root.render(jsx('p', { children: null }));
		expect(container.querySelector('p')).not.toBeNull();
		expect(container.querySelector('p')?.textContent).toBe('');

		root.render(jsx('p', { children: undefined }));
		expect(container.querySelector('p')).not.toBeNull();
		expect(container.querySelector('p')?.textContent).toBe('');
	});

	test('nullish bindings remove existing attributes, listeners, and properties', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const tagName = 'radiant-jsx-binding-receiver';

		class BindingReceiverElement extends HTMLElement {
			payload: unknown = 'unset';
		}

		customElements.define(tagName, BindingReceiverElement);

		const container = document.createElement('div');
		const root = createRoot(container);
		let clicks = 0;
		const handleClick = () => {
			clicks += 1;
		};

		root.render(
			jsx(tagName, {
				class: 'alpha',
				hidden: true,
				'on:click': handleClick,
				'prop:payload': { count: 1 },
			}),
		);

		const element = container.querySelector(tagName) as HTMLElement & { payload?: unknown };
		expect(element.getAttribute('class')).toBe('alpha');
		expect(element.hasAttribute('hidden')).toBe(true);
		expect(element.payload).toEqual({ count: 1 });

		element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicks).toBe(1);

		root.render(
			jsx(tagName, {
				class: null,
				hidden: false,
				'on:click': null,
				'prop:payload': undefined,
			}),
		);

		const updatedElement = container.querySelector(tagName) as HTMLElement & { payload?: unknown };
		expect(updatedElement).not.toBeNull();
		expect(updatedElement.hasAttribute('class')).toBe(false);
		expect(updatedElement.hasAttribute('hidden')).toBe(false);
		expect(updatedElement.payload).toBeUndefined();

		updatedElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicks).toBe(1);
	});

	test('hydrates an explicit false property over a custom-element true default', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const renderBooleanProperty = (enabled: boolean) => jsx(booleanPropertyTagName, { 'prop:enabled': enabled });

		container.innerHTML = `<${booleanPropertyTagName} data-radiant-jsx-bind-0="prop:enabled"></${booleanPropertyTagName}>`;
		const element = container.querySelector(booleanPropertyTagName) as BooleanPropertyElement;

		expect(element.enabled).toBe(true);

		root.hydrate(renderBooleanProperty(false));

		expect(element.enabled).toBe(false);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
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

	test('mounts nested SVG defs with canonical camel-cased element names under HTML parents', async () => {
		const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx('div', {
				children: jsxs('svg', {
					viewBox: '0 0 100 100',
					xmlns: 'http://www.w3.org/2000/svg',
					children: [
						jsxs('defs', {
							children: [
								jsxs('linearGradient', {
									id: 'gradient',
									children: [
										jsx('stop', { offset: '0%', 'stop-color': '#000' }),
										jsx('stop', { offset: '100%', 'stop-color': '#fff' }),
									],
								}),
								jsx('filter', {
									id: 'shadow',
									children: jsx('feDropShadow', {
										dx: '0',
										dy: '2',
										stdDeviation: '2',
									}),
								}),
							],
						}),
						jsx('rect', {
							width: '100',
							height: '100',
							fill: 'url(#gradient)',
							filter: 'url(#shadow)',
						}),
					],
				}),
			}),
		);

		const gradient = container.querySelector('linearGradient');
		const dropShadow = container.querySelector('feDropShadow');

		expect(gradient?.localName).toBe('linearGradient');
		expect(gradient?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(dropShadow?.localName).toBe('feDropShadow');
		expect(dropShadow?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(container.innerHTML).toContain('<linearGradient id="gradient">');
		expect(container.innerHTML).toContain('<feDropShadow dx="0" dy="2" stdDeviation="2"></feDropShadow>');
	});

	test('manual template results without root metadata do not poison later intrinsic SVG mounts', async () => {
		const [{ jsx, toTemplateResultLike }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const primeContainer = document.createElement('div');
		const primeRoot = createRoot(primeContainer);
		const verifyContainer = document.createElement('div');
		const verifyRoot = createRoot(verifyContainer);
		// Built through the wire-format adapter: no rootLocalName, so the renderer
		// has to infer the namespace from context rather than from root metadata.
		const manualTemplate = toTemplateResultLike({
			strings: ['<linearGradient id=', '></linearGradient>'],
			values: ['gradient'],
		});

		primeRoot.render(
			jsx('svg', {
				children: manualTemplate,
			}),
		);

		verifyRoot.render(
			jsx('svg', {
				children: jsx('linearGradient', {
					id: 'gradient',
				}),
			}),
		);

		const gradient = verifyContainer.querySelector('svg')?.firstElementChild;

		expect(gradient?.localName).toBe('linearGradient');
		expect(gradient?.namespaceURI).toBe('http://www.w3.org/2000/svg');
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
		const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
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

		container.innerHTML = HYDRATE_NESTED_SVG_ICON_HTML;
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

	test('hydrates nested SVG defs with canonical camel-cased element names under HTML parents', async () => {
		const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderGradientIcon = () =>
			jsx('div', {
				children: jsxs('svg', {
					viewBox: '0 0 100 100',
					xmlns: 'http://www.w3.org/2000/svg',
					children: [
						jsxs('defs', {
							children: [
								jsxs('linearGradient', {
									id: 'gradient',
									children: [
										jsx('stop', { offset: '0%', 'stop-color': '#000' }),
										jsx('stop', { offset: '100%', 'stop-color': '#fff' }),
									],
								}),
								jsx('filter', {
									id: 'shadow',
									children: jsx('feDropShadow', {
										dx: '0',
										dy: '2',
										stdDeviation: '2',
									}),
								}),
							],
						}),
						jsx('rect', {
							width: '100',
							height: '100',
							fill: 'url(#gradient)',
							filter: 'url(#shadow)',
						}),
					],
				}),
			});

		container.innerHTML = HYDRATE_GRADIENT_ICON_HTML;
		root.hydrate(renderGradientIcon());

		const gradient = container.querySelector('linearGradient');
		const dropShadow = container.querySelector('feDropShadow');

		expect(gradient?.localName).toBe('linearGradient');
		expect(gradient?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(dropShadow?.localName).toBe('feDropShadow');
		expect(dropShadow?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(container.innerHTML).toContain('<linearGradient id="gradient">');
		expect(container.innerHTML).toContain('<feDropShadow dx="0" dy="2" stdDeviation="2"></feDropShadow>');
	});

	test('hydrates iterable-root SSR bindings through per-child template hydration', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
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

		container.innerHTML = HYDRATE_ITERABLE_ROOT_HTML;
		root.hydrate(renderIterableRoot());

		const buttons = Array.from(container.querySelectorAll('button'));
		buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(clickTotal).toBe(11);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
	});

	test('unmount releases delegated listeners attached during iterable-root hydration', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		document.body.append(container);
		const root = createRoot(container);
		let clickTotal = 0;
		const increment = () => {
			clickTotal += 1;
		};

		container.innerHTML = HYDRATE_ITERABLE_ROOT_HTML;
		root.hydrate([
			jsx('button', { 'on:click': increment, children: 'Alpha' }),
			jsx('button', { 'on:click': increment, children: 'Beta' }),
		]);

		const hydratedButton = container.querySelector('button');
		hydratedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clickTotal).toBe(1);

		// Iterable roots register delegated listeners on the host, so unmount must
		// release them even though no template instance owns the root.
		root.unmount();
		container.append(hydratedButton!);
		hydratedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(clickTotal).toBe(1);

		container.remove();
	});

	test('reconnects list children that carry dynamic content instead of rebuilding them', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const items = [
			{ id: 'a', name: 'Alpha' },
			{ id: 'b', name: 'Beta' },
		];
		const renderList = (entries: typeof items) =>
			jsx('ul', {
				class: 'list',
				children: entries.map((item) => jsx('li', { class: 'item', 'data-id': item.id, children: item.name })),
			});

		container.innerHTML = HYDRATE_DYNAMIC_LIST_HTML;
		const serverItems = Array.from(container.querySelectorAll('li'));
		const serverText = Array.from(serverItems[0]!.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);

		root.hydrate(renderList(items));

		// Identity is the only signal: rebuilding produces identical markup while
		// dropping listeners, focus, and selection. Both the elements and the text
		// nodes inside each child range are reused, not re-created.
		expect(Array.from(container.querySelectorAll('li'))).toEqual(serverItems);
		expect(Array.from(serverItems[0]!.childNodes)).toContain(serverText);
		expect(serverText?.textContent).toBe('Alpha');
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');

		root.render(
			renderList([
				{ id: 'a', name: 'Alpha updated' },
				{ id: 'b', name: 'Beta' },
			]),
		);

		expect(container.querySelector('li')?.textContent).toBe('Alpha updated');
		expect(Array.from(container.querySelectorAll('li'))).toEqual(serverItems);
	});

	test('reconnects list children whose template owns more than one root node', async () => {
		const [{ jsx, toTemplateResultLike }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		// Only transported payloads produce multi-root templates; createJsxElement
		// always emits exactly one root element.
		const multiRoot = () => toTemplateResultLike({ strings: ['<b>', '</b><i>tail</i>'], values: ['head'] });

		container.innerHTML =
			'<div data-radiant-jsx-bind-0="attr:class" class="host"><b>head</b><i>tail</i><b>head</b><i>tail</i></div>';
		const serverNodes = Array.from(container.querySelectorAll('b, i'));

		root.hydrate(jsx('div', { class: 'host', children: [multiRoot(), multiRoot()] }));

		expect(Array.from(container.querySelectorAll('b, i'))).toEqual(serverNodes);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
	});

	test('removes every SSR marker when hydrating attribute-only list children', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		container.innerHTML =
			'<div data-radiant-jsx-bind-0="attr:class" class="list">' +
			'<span data-radiant-jsx-bind-1="attr:class" class="chip" data-radiant-jsx-bind-2="attr:title" title="a"></span>' +
			'<span data-radiant-jsx-bind-3="attr:class" class="chip" data-radiant-jsx-bind-4="attr:title" title="b"></span>' +
			'</div>';

		root.hydrate(
			jsx('div', {
				class: 'list',
				children: ['a', 'b'].map((title) => jsx('span', { class: 'chip', title })),
			}),
		);

		// Marker names are global, so a nested child cannot strip them using its own
		// local value indexes — that left later children's markers in the document.
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
	});

	test('removes SSR hydration marker attributes after template hydration', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let clickCount = 0;
		const handleClick = () => {
			clickCount += 1;
		};
		const renderHydratedButton = (label: string, hidden = false) =>
			jsx('button', {
				class: 'action',
				hidden,
				'on:click': handleClick,
				title: label,
				children: label,
			});

		container.innerHTML = HYDRATE_BUTTON_ALPHA_HTML;
		root.hydrate(renderHydratedButton('Alpha'));

		const initialButton = container.querySelector('button');

		expect(initialButton).not.toBeNull();
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');

		initialButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clickCount).toBe(1);

		root.render(renderHydratedButton('Beta', true));

		const updatedButton = container.querySelector('button');

		expect(updatedButton).toBe(initialButton);
		expect(updatedButton?.textContent).toBe('Beta');
		expect(updatedButton?.getAttribute('title')).toBe('Beta');
		expect(updatedButton?.hasAttribute('hidden')).toBe(true);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
	});

	test('falls back to a full render when iterable-root hydration markers are malformed', async () => {
		const [{ jsx }, { createRoot }, { resetRuntimeWarningsForTests, setDevWarningsEnabled }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadJsxDevRuntime(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const renderIterableRoot = () => [
			jsx('button', {
				class: 'alpha',
				'on:click': () => undefined,
				children: 'Alpha',
			}),
		];

		container.innerHTML = HYDRATE_ITERABLE_ROOT_SINGLE_HTML.replace('attr:class', 'not-a-binding').replace(
			'data-radiant-jsx-bind-1',
			'data-radiant-jsx-bind-99',
		);

		resetRuntimeWarningsForTests();
		setDevWarningsEnabled(true);

		try {
			root.hydrate(renderIterableRoot());

			expect(warnSpy).not.toHaveBeenCalled();
			expect(container.querySelector('button')?.className).toBe('alpha');
			expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
		} finally {
			resetRuntimeWarningsForTests();
			setDevWarningsEnabled(undefined);
			warnSpy.mockRestore();
		}
	});

	test('template hydration falls back through a recoverable mismatch when SSR DOM shape drifts', async () => {
		const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderHydratedCard = (label: string) =>
			jsx('section', {
				children: jsxs('p', {
					children: ['Count: ', label],
				}),
			});

		container.innerHTML = HYDRATE_CARD_ALPHA_HTML;
		container.querySelector('p')?.remove();

		root.hydrate(renderHydratedCard('beta'));

		expect(container.innerHTML).toBe('<section><p>Count: beta</p></section>');
	});

	test('hydrate performs a full rerender when the target has no hydration markers', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const renderView = (label: string) => jsx('button', { class: 'action', children: label });

		container.innerHTML = PLAIN_BUTTON_ALPHA_HTML;
		const serverButton = container.querySelector('button');

		root.hydrate(renderView('beta'));

		const hydratedButton = container.querySelector('button');
		expect(hydratedButton).not.toBe(serverButton);
		expect(container.innerHTML).toBe('<button class="action">beta</button>');
	});

	test('warns when external DOM mutation detaches renderer-managed child anchors', async () => {
		const [{ jsx }, { createRoot }, { resetRuntimeWarningsForTests, setDevWarningsEnabled }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadJsxDevRuntime(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const renderNestedChild = (value: string) =>
			jsx('p', {
				children: jsx('strong', { children: value }),
			});

		root.render(renderNestedChild('alpha'));
		const paragraph = container.querySelector('p');
		paragraph!.innerHTML = 'external';

		resetRuntimeWarningsForTests();
		setDevWarningsEnabled(true);

		try {
			root.render(jsx('p', { children: 'beta' }));
			expect(warnSpy).toHaveBeenCalled();
			expect(String(warnSpy.mock.calls[0]?.[0] ?? '')).toContain(
				'A renderer-managed DOM range was mutated outside Radiant JSX control',
			);
		} finally {
			resetRuntimeWarningsForTests();
			setDevWarningsEnabled(undefined);
			warnSpy.mockRestore();
		}
	});

	test('hydrates adjacent attribute-only child templates without crossing sibling ranges', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderHydratedField = (id: string, label: string, hidden = false) =>
			jsx('input', {
				'aria-label': label,
				'data-id': id,
				hidden,
				title: label,
				type: 'text',
			});

		const renderHydratedFields = (alphaLabel: string, betaLabel: string, betaHidden = false) =>
			jsx('section', {
				children: [
					renderHydratedField('alpha', alphaLabel),
					renderHydratedField('beta', betaLabel, betaHidden),
				],
			});

		container.innerHTML = HYDRATE_ADJACENT_FIELDS_HTML;
		root.hydrate(renderHydratedFields('Alpha', 'Beta'));

		const initialInputs = Array.from(container.querySelectorAll('input'));
		const alphaInput = initialInputs[0];
		const betaInput = initialInputs[1];

		expect(alphaInput?.getAttribute('title')).toBe('Alpha');
		expect(betaInput?.getAttribute('title')).toBe('Beta');

		root.render(renderHydratedFields('Alpha updated', 'Beta updated', true));

		const updatedInputs = Array.from(container.querySelectorAll('input'));

		expect(updatedInputs).toHaveLength(2);
		expect(updatedInputs[0]).toBe(alphaInput);
		expect(updatedInputs[1]).toBe(betaInput);
		expect(updatedInputs[0]?.getAttribute('title')).toBe('Alpha updated');
		expect(updatedInputs[0]?.getAttribute('aria-label')).toBe('Alpha updated');
		expect(updatedInputs[1]?.getAttribute('title')).toBe('Beta updated');
		expect(updatedInputs[1]?.getAttribute('aria-label')).toBe('Beta updated');
		expect(updatedInputs[1]?.hasAttribute('hidden')).toBe(true);
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
					jsxs('p', { class: 'component-tag', children: ['RadiantElement'] }),
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

	test('unsafeHtml mounts trusted markup as DOM nodes instead of escaped text', async () => {
		const [{ jsx, unsafeHtml }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx('div', {
				children: unsafeHtml('<span data-trusted="yes">Trusted</span>'),
			}),
		);

		expect(container.innerHTML).toBe('<div><span data-trusted="yes">Trusted</span></div>');
		expect(container.querySelector('span')?.getAttribute('data-trusted')).toBe('yes');
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

	test('hydrated subscribable child values patch without rerendering the parent tree', async () => {
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
		const renderMetric = () =>
			jsxs('p', {
				class: 'component-metric',
				children: ['Count: ', boundCount],
			});

		container.innerHTML = HYDRATE_METRIC_HTML;
		root.hydrate(renderMetric());

		expect(container.querySelector('p')?.textContent).toBe('Count: 15');

		count = 16;

		for (const subscriber of subscribers) {
			subscriber(count);
		}

		await Promise.resolve();

		expect(container.querySelector('p')?.textContent).toBe('Count: 16');
	});

	test('hydration subscribes exactly once per reactive child and leaves nothing behind on unmount', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: number) => void>();
		let subscribeCalls = 0;
		let count = 15;
		const boundCount = createSubscribableJsxValue({
			getValue: () => count,
			subscribe: (notify) => {
				subscribeCalls += 1;
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});

		container.innerHTML = HYDRATE_METRIC_HTML;
		root.hydrate(
			jsxs('p', {
				class: 'component-metric',
				children: ['Count: ', boundCount],
			}),
		);

		// Hydration planning must never mount the subtree it is measuring: one live
		// binding means exactly one subscription, with no detached extras retained.
		expect(subscribeCalls).toBe(1);
		expect(subscribers.size).toBe(1);

		root.unmount();

		expect(subscribers.size).toBe(0);
	});

	test('hydrated fragment subscribable child values patch without rerendering the parent tree', async () => {
		const [{ createSubscribableJsxValue, Fragment, jsx, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: number) => void>();
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
		const renderCounter = () =>
			jsxs(Fragment, {
				children: [
					jsx('button', { id: 'dec', children: '-' }),
					jsx('span', { id: 'metric', children: boundCount }),
					jsx('button', { id: 'inc', children: '+' }),
				],
			});

		container.innerHTML = HYDRATE_FRAGMENT_COUNTER_HTML;
		root.hydrate(renderCounter());

		expect(container.querySelector('#metric')?.textContent).toBe('2');

		count = 3;

		for (const subscriber of subscribers) {
			subscriber(count);
		}

		await Promise.resolve();

		expect(container.querySelector('#metric')?.textContent).toBe('3');
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

	test('stale child subscription callbacks are ignored after reactive rebind', async () => {
		const [{ jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let firstValue = 'alpha';
		let secondValue = 'beta';
		let firstNotify: ((value: string) => void) | undefined;
		let secondNotify: ((value: string) => void) | undefined;
		let firstUnsubscribeCount = 0;
		let secondUnsubscribeCount = 0;
		const firstSignal = {
			get: () => firstValue,
			subscribe: (notify: (value: string) => void) => {
				firstNotify = notify;
				return () => {
					firstUnsubscribeCount += 1;
				};
			},
		};
		const secondSignal = {
			get: () => secondValue,
			subscribe: (notify: (value: string) => void) => {
				secondNotify = notify;
				return () => {
					secondUnsubscribeCount += 1;
				};
			},
		};

		root.render(
			jsxs('p', {
				children: ['Value: ', firstSignal],
			}),
		);
		expect(container.innerHTML).toBe('<p>Value: alpha</p>');

		root.render(
			jsxs('p', {
				children: ['Value: ', secondSignal],
			}),
		);

		expect(container.innerHTML).toBe('<p>Value: beta</p>');
		expect(firstUnsubscribeCount).toBe(1);
		expect(secondUnsubscribeCount).toBe(0);

		firstNotify?.('stale');
		await Promise.resolve();
		expect(container.innerHTML).toBe('<p>Value: beta</p>');

		secondValue = 'gamma';
		secondNotify?.(secondValue);
		await Promise.resolve();
		expect(container.innerHTML).toBe('<p>Value: gamma</p>');
	});

	test('stale attribute subscription callbacks are ignored after reactive rebind', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let firstStatus = 'idle';
		let secondStatus = 'loading';
		let firstNotify: ((value: string) => void) | undefined;
		let secondNotify: ((value: string) => void) | undefined;
		let firstUnsubscribeCount = 0;
		const firstSignal = {
			get: () => firstStatus,
			subscribe: (notify: (value: string) => void) => {
				firstNotify = notify;
				return () => {
					firstUnsubscribeCount += 1;
				};
			},
		};
		const secondSignal = {
			get: () => secondStatus,
			subscribe: (notify: (value: string) => void) => {
				secondNotify = notify;
				return () => undefined;
			},
		};

		root.render(
			jsx('button', {
				data: { status: firstSignal },
				children: 'Fetch',
			}),
		);
		expect(container.querySelector('button')?.getAttribute('data-status')).toBe('idle');

		root.render(
			jsx('button', {
				data: { status: secondSignal },
				children: 'Fetch',
			}),
		);

		const button = container.querySelector('button');
		expect(button?.getAttribute('data-status')).toBe('loading');
		expect(firstUnsubscribeCount).toBe(1);

		firstNotify?.('stale');
		await Promise.resolve();
		expect(button?.getAttribute('data-status')).toBe('loading');

		secondStatus = 'ready';
		secondNotify?.(secondStatus);
		await Promise.resolve();
		expect(button?.getAttribute('data-status')).toBe('ready');
	});

	test('keyed reactive children move without resubscribing nested owners', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		const createSignalSource = (initialValue: string) => {
			let value = initialValue;
			let subscribeCount = 0;
			let unsubscribeCount = 0;
			const subscribers = new Set<(nextValue: string) => void>();

			return {
				counts: () => ({ subscribeCount, unsubscribeCount }),
				signal: {
					get: () => value,
					subscribe: (notify: (nextValue: string) => void) => {
						subscribeCount += 1;
						subscribers.add(notify);

						return () => {
							unsubscribeCount += 1;
							subscribers.delete(notify);
						};
					},
				},
				set: (nextValue: string) => {
					value = nextValue;

					for (const subscriber of subscribers) {
						subscriber(nextValue);
					}
				},
			};
		};

		const sources = new Map([
			['alpha', createSignalSource('A')],
			['beta', createSignalSource('B')],
		]);

		const renderList = (order: string[]) =>
			jsx('ul', {
				children: order.map((key) =>
					jsx('li', {
						children: sources.get(key)?.signal,
						key,
					}),
				),
			});

		root.render(renderList(['alpha', 'beta']));

		const initialItems = Array.from(container.querySelectorAll('li'));
		expect(initialItems.map((item) => item.textContent)).toEqual(['A', 'B']);

		root.render(renderList(['beta', 'alpha']));

		const movedItems = Array.from(container.querySelectorAll('li'));
		expect(movedItems.map((item) => item.textContent)).toEqual(['B', 'A']);
		expect(movedItems[0]).toBe(initialItems[1]);
		expect(movedItems[1]).toBe(initialItems[0]);
		expect(sources.get('alpha')?.counts()).toEqual({ subscribeCount: 1, unsubscribeCount: 0 });
		expect(sources.get('beta')?.counts()).toEqual({ subscribeCount: 1, unsubscribeCount: 0 });

		sources.get('alpha')?.set('A2');
		await Promise.resolve();
		expect(Array.from(container.querySelectorAll('li')).map((item) => item.textContent)).toEqual(['B', 'A2']);
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

	test('a reactive value rendered at the root stays subscribed and patches in place', async () => {
		const [{ createSubscribableJsxValue }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: string) => void>();
		let label = 'first';
		const boundLabel = createSubscribableJsxValue({
			getValue: () => label,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});

		root.render(boundLabel);

		expect(container.textContent).toBe('first');
		expect(subscribers.size).toBe(1);

		label = 'second';

		for (const subscriber of subscribers) {
			subscriber(label);
		}

		expect(container.textContent).toBe('second');

		root.unmount();

		expect(subscribers.size).toBe(0);
	});

	test('a reactive template rendered at the root drives updates without a wrapping element', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: number) => void>();
		let count = 1;
		const boundView = createSubscribableJsxValue({
			getValue: () => count,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		}).map((value) => jsxs('p', { class: 'count', children: ['Count: ', value] }));

		root.render(boundView);

		expect(container.innerHTML).toBe('<p class="count">Count: 1</p>');

		const mountedParagraph = container.querySelector('p');
		count = 2;

		for (const subscriber of subscribers) {
			subscriber(count);
		}

		expect(container.innerHTML).toBe('<p class="count">Count: 2</p>');
		// The template shape is stable, so the root patches the existing element
		// rather than replacing the subtree.
		expect(container.querySelector('p')).toBe(mountedParagraph);
	});

	test('root renders reconcile keyed lists in place instead of rebuilding them', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const renderList = (keys: readonly string[]) => keys.map((key) => jsx('li', { children: key }, key));

		root.render(renderList(['a', 'b', 'c']));

		const initialItems = new Map(
			Array.from(container.querySelectorAll('li'), (item) => [item.textContent, item] as const),
		);

		root.render(renderList(['c', 'a', 'b']));

		expect(Array.from(container.querySelectorAll('li'), (item) => item.textContent)).toEqual(['c', 'a', 'b']);

		for (const [key, item] of initialItems) {
			expect(container.querySelector('li:nth-child(' + (['c', 'a', 'b'].indexOf(key!) + 1) + ')')).toBe(item);
		}
	});

	test('map derives a record lookup and patches only the text node without rerendering', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const THEME_CONFIG = {
			light: { label: 'Light', icon: 'sun' },
			dark: { label: 'Dark', icon: 'moon' },
		} as const;
		type ThemeKey = keyof typeof THEME_CONFIG;
		const subscribers = new Set<(value: ThemeKey) => void>();
		let preference: ThemeKey = 'light';
		const boundPreference = createSubscribableJsxValue({
			getValue: () => preference,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});
		const themeLabel = boundPreference.map((p) => THEME_CONFIG[p].label);

		root.render(jsxs('p', { children: ['Theme: ', themeLabel] }));
		expect(container.innerHTML).toBe('<p>Theme: Light</p>');

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

		preference = 'dark';

		for (const subscriber of subscribers) {
			subscriber(preference);
		}

		await Promise.resolve();
		observer.disconnect();

		expect(container.innerHTML).toBe('<p>Theme: Dark</p>');
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('Light');
	});

	test('map projects an object prop key and patches on whole-object replacement', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		type ConfigValue = { label: string };
		const subscribers = new Set<(value: import('../src/jsx-runtime.ts').JsxRenderable) => void>();
		let config: unknown = { label: 'Hello' };
		const boundConfig = createSubscribableJsxValue<import('../src/jsx-runtime.ts').JsxRenderable>({
			getValue: () => config as import('../src/jsx-runtime.ts').JsxRenderable,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});
		const configLabel = boundConfig.map((c) => (c as unknown as ConfigValue).label);

		root.render(jsxs('p', { children: ['Config: ', configLabel] }));
		expect(container.innerHTML).toBe('<p>Config: Hello</p>');

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

		config = { label: 'Next' };

		for (const subscriber of subscribers) {
			subscriber(config as import('../src/jsx-runtime.ts').JsxRenderable);
		}

		await Promise.resolve();
		observer.disconnect();

		expect(container.innerHTML).toBe('<p>Config: Next</p>');
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('Hello');
	});

	test('mapSubscribable derives over a signal-like source and patches in place', async () => {
		const [{ jsxs, mapSubscribable }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const { state } = await import('@ecopages/signals');
		const container = document.createElement('div');
		const root = createRoot(container);
		const countSignal = state(3);
		const doubled = mapSubscribable(countSignal, (value) => value * 2);

		root.render(jsxs('p', { children: ['Double: ', doubled] }));
		expect(container.innerHTML).toBe('<p>Double: 6</p>');

		countSignal.set(5);

		await Promise.resolve();
		expect(container.innerHTML).toBe('<p>Double: 10</p>');
	});

	test('a derived binding created once reuses its live subscription across re-renders', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let subscribeCount = 0;
		let unsubscribeCount = 0;
		const subscribers = new Set<(value: number) => void>();
		let count = 1;
		const boundCount = createSubscribableJsxValue({
			getValue: () => count,
			subscribe: (notify) => {
				subscribeCount += 1;
				subscribers.add(notify);
				return () => {
					unsubscribeCount += 1;
					subscribers.delete(notify);
				};
			},
		});
		const doubled = boundCount.map((value) => value * 2);

		const render = () => root.render(jsxs('p', { children: ['Double: ', doubled] }));
		render();
		expect(container.innerHTML).toBe('<p>Double: 2</p>');
		render();
		expect(container.innerHTML).toBe('<p>Double: 2</p>');
		expect(subscribeCount).toBe(1);
		expect(unsubscribeCount).toBe(0);

		count = 4;

		for (const subscriber of subscribers) {
			subscriber(count);
		}

		await Promise.resolve();
		expect(container.innerHTML).toBe('<p>Double: 8</p>');
	});

	test('proxy member access derives an object prop and patches on whole-object replacement', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		type ConfigValue = { label: string };
		const subscribers = new Set<(value: import('../src/jsx-runtime.ts').JsxRenderable) => void>();
		let config: unknown = { label: 'Hello' };
		const boundConfig = createSubscribableJsxValue<import('../src/jsx-runtime.ts').JsxRenderable>({
			getValue: () => config as import('../src/jsx-runtime.ts').JsxRenderable,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});
		const configLabel = (boundConfig as unknown as ConfigValue).label;

		root.render(jsxs('p', { children: ['Config: ', configLabel] }));
		expect(container.innerHTML).toBe('<p>Config: Hello</p>');

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

		config = { label: 'Next' };

		for (const subscriber of subscribers) {
			subscriber(config as import('../src/jsx-runtime.ts').JsxRenderable);
		}

		await Promise.resolve();
		observer.disconnect();

		expect(container.innerHTML).toBe('<p>Config: Next</p>');
		expect(mutations.filter((mutation) => mutation.type === 'childList')).toHaveLength(0);
		expect(mutations.filter((mutation) => mutation.type === 'characterData')).toHaveLength(1);
		expect(mutations.find((mutation) => mutation.type === 'characterData')?.oldValue).toBe('Hello');
	});

	test('proxy member access supports chained keys via repeated map delegation', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		type ThemeValue = { label: string };
		type ConfigValue = { theme: ThemeValue };
		const subscribers = new Set<(value: import('../src/jsx-runtime.ts').JsxRenderable) => void>();
		let config: unknown = { theme: { label: 'Hello' } };
		const boundConfig = createSubscribableJsxValue<import('../src/jsx-runtime.ts').JsxRenderable>({
			getValue: () => config as import('../src/jsx-runtime.ts').JsxRenderable,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});
		const themeLabel = (boundConfig as unknown as ConfigValue).theme.label;

		root.render(jsxs('p', { children: ['Theme: ', themeLabel] }));
		expect(container.innerHTML).toBe('<p>Theme: Hello</p>');

		config = { theme: { label: 'Next' } };

		for (const subscriber of subscribers) {
			subscriber(config as import('../src/jsx-runtime.ts').JsxRenderable);
		}

		await Promise.resolve();
		expect(container.innerHTML).toBe('<p>Theme: Next</p>');
	});

	test('serializes reactive object style bindings to the style attribute and updates in place', async () => {
		const [{ createSubscribableJsxValue, jsx }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const { state } = await import('@ecopages/signals');
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: Record<string, string>) => void>();
		let styleObject: Record<string, string> = { color: 'tomato' };
		const boundStyle = createSubscribableJsxValue({
			getValue: () => styleObject,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});
		const signalStyle = state<Record<string, string>>({ backgroundColor: 'navy' });

		root.render(jsx('div', { id: 'sub', style: boundStyle }));
		const subHost = container.querySelector('#sub') as HTMLDivElement;
		expect(subHost.getAttribute('style')).toBe('color: tomato');

		styleObject = { color: 'green', paddingInline: '8px' };
		for (const subscriber of subscribers) {
			subscriber(styleObject);
		}
		await Promise.resolve();
		expect(subHost.getAttribute('style')).toBe('color: green; padding-inline: 8px');

		root.render(jsx('div', { id: 'sig', style: signalStyle }));
		const sigHost = container.querySelector('#sig') as HTMLDivElement;
		expect(sigHost.getAttribute('style')).toBe('background-color: navy');

		signalStyle.set({ backgroundColor: 'maroon', marginTop: '4px' });
		await Promise.resolve();
		expect(sigHost.getAttribute('style')).toBe('background-color: maroon; margin-top: 4px');
	});
});
