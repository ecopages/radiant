import { beforeEach, describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../dist/jsx-runtime.js')>('../dist/jsx-runtime.js');
const loadJsxModule = async () => loadModule<typeof import('../dist/index.js')>('../dist/index.js');
const loadServerRender = async () => loadModule<typeof import('../dist/server.js')>('../dist/server.js');

describe('Radiant JSX dist DOM reconciliation parity', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
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

	test('hydrates nested SVG defs with canonical camel-cased element names under HTML parents', async () => {
		const [{ jsx, jsxs }, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
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

		container.innerHTML = renderToString(renderGradientIcon(), { mode: 'hydrate' });
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

	test('hydrates SVG attribute markers without transient value drift', async () => {
		const [jsxRuntime, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
		const { jsx, jsxs } = jsxRuntime;
		const container = document.createElement('div');
		const root = createRoot(container);

		const renderIconButton = () =>
			jsxs(jsxRuntime.Fragment, {
				children: [
					jsx('label', {
						for: 'todo-1',
						children: [jsx('input', { id: 'todo-1', name: '1', type: 'checkbox', checked: false }), 'Task'],
					}),
					jsx('button', {
						class: 'todo__item-remove',
						type: 'button',
						'data-ref': 'remove-todo',
						'aria-label': 'Remove todo: 1',
						children: jsxs('svg', {
							class: 'pointer-events-none',
							width: '20',
							height: '20',
							'aria-hidden': 'true',
							focusable: 'false',
							viewBox: '0 0 24 24',
							fill: 'none',
							stroke: 'currentColor',
							'stroke-width': '2',
							'stroke-linecap': 'round',
							'stroke-linejoin': 'round',
							children: [jsx('path', { d: 'M18 6 6 18' }), jsx('path', { d: 'm6 6 12 12' })],
						}),
					}),
				],
			});

		container.innerHTML = renderToString(renderIconButton(), { mode: 'hydrate' });

		const invalidAssignments: Array<{ name: string; value: string | null }> = [];
		const originalSetAttribute = Element.prototype.setAttribute;

		Element.prototype.setAttribute = function patchedSetAttribute(name: string, value: string) {
			if (
				this.localName === 'svg' &&
				((name === 'width' && value === 'none') ||
					(name === 'height' && value === 'currentColor') ||
					(name === 'viewBox' && value === 'round') ||
					(name === 'width' && value === 'currentColor') ||
					(name === 'viewBox' && value === 'M18 6 6 18'))
			) {
				invalidAssignments.push({ name, value });
			}

			return originalSetAttribute.call(this, name, value);
		};

		try {
			root.hydrate(renderIconButton());
		} finally {
			Element.prototype.setAttribute = originalSetAttribute;
		}

		expect(invalidAssignments).toEqual([]);
	});
});
