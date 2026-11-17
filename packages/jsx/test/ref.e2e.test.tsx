import { beforeEach, describe, expect, test, vi } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');
const loadServerRender = async () =>
	loadModule<typeof import('../src/ssr/server-render.ts')>('../src/ssr/server-render.ts');

class RefHostElement extends HTMLElement {
	ref: unknown = undefined;
}

customElements.define('radiant-jsx-ref-host', RefHostElement);

describe('JSX ref', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('calls the callback with the mounted node and writes no ref attribute or property', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const ref = vi.fn();

		createRoot(container).render(jsx('input', { ref }));

		const input = container.querySelector('input')!;
		expect(ref).toHaveBeenCalledTimes(1);
		expect(ref).toHaveBeenCalledWith(input);
		expect(input.hasAttribute('ref')).toBe(false);
		expect(container.innerHTML).not.toContain('ref');
	});

	test('attaches once the node is in the container', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		document.body.append(container);
		let connected: boolean | undefined;

		createRoot(container).render(
			jsx('div', {
				children: jsx('span', {
					ref: (node: HTMLElement | null) => {
						connected = node?.isConnected;
					},
				}),
			}),
		);

		expect(connected).toBe(true);
	});

	test('re-rendering with the same callback does not call it again', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const ref = vi.fn();

		root.render(jsx('p', { ref, children: 'one' }));
		root.render(jsx('p', { ref, children: 'two' }));

		expect(container.textContent).toBe('two');
		expect(ref).toHaveBeenCalledTimes(1);
	});

	test('a different callback gets null from the old one and the node from the new one', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const first = vi.fn();
		const second = vi.fn();

		root.render(jsx('p', { ref: first }));
		const node = container.querySelector('p');
		root.render(jsx('p', { ref: second }));

		expect(container.querySelector('p')).toBe(node);
		expect(first.mock.calls).toEqual([[node], [null]]);
		expect(second.mock.calls).toEqual([[node]]);
	});

	test('replacing the callback runs the cleanup the old one returned instead of calling it with null', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const cleanup = vi.fn();
		const first = vi.fn(() => cleanup);
		const second = vi.fn();

		root.render(jsx('p', { ref: first }));
		root.render(jsx('p', { ref: second }));

		expect(first).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	test('dropping the ref detaches it', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const ref = vi.fn();

		root.render(jsx('p', { ref }));
		const node = container.querySelector('p');
		root.render(jsx('p', {}));

		expect(container.querySelector('p')).toBe(node);
		expect(ref.mock.calls).toEqual([[node], [null]]);
	});

	test('a ref that becomes null detaches the old callback', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const ref = vi.fn();

		root.render(jsx('p', { ref }));
		const node = container.querySelector('p');
		root.render(jsx('p', { ref: null }));

		expect(container.querySelector('p')).toBe(node);
		expect(ref.mock.calls).toEqual([[node], [null]]);
	});

	test('a ref that stays bound while another attribute is added is not called again', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const ref = vi.fn();

		root.render(jsx('p', { ref }));
		const node = container.querySelector('p');
		root.render(jsx('p', { id: 'x', ref }));

		expect(container.querySelector('p')).toBe(node);
		expect(ref.mock.calls).toEqual([[node]]);
	});

	test('a ref inside a reactive child attaches and detaches with the child', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const ref = vi.fn();
		let current: unknown = jsx('p', { ref });
		const listeners = new Set<(value: unknown) => void>();
		const source = {
			get: () => current,
			subscribe: (listener: (value: unknown) => void) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		};

		createRoot(container).render(jsx('div', { children: source }));
		const node = container.querySelector('p');
		current = jsx('span', {});
		for (const listener of listeners) listener(current);

		expect(node).not.toBeNull();
		expect(ref.mock.calls).toEqual([[node], [null]]);
	});

	test('removing the element calls the callback with null, or runs the returned cleanup', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const plain = vi.fn();
		const cleanup = vi.fn();
		const withCleanup = vi.fn(() => cleanup);

		const view = (show: boolean) =>
			jsx('div', {
				children: show ? [jsx('a', { ref: plain }), jsx('b', { ref: withCleanup })] : null,
			});

		root.render(view(true));
		const anchor = container.querySelector('a');
		expect(plain.mock.calls).toEqual([[anchor]]);
		expect(withCleanup).toHaveBeenCalledTimes(1);

		root.render(view(false));

		expect(plain.mock.calls).toEqual([[anchor], [null]]);
		expect(withCleanup).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledTimes(1);
	});

	test('unmounting the root detaches the refs', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const ref = vi.fn();

		root.render(jsx('p', { ref }));
		const node = container.querySelector('p');
		root.unmount();

		expect(ref.mock.calls).toEqual([[node], [null]]);
	});

	test('a keyed move keeps the node and does not call the ref again', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const refs = new Map(['a', 'b', 'c'].map((key) => [key, vi.fn()]));

		const view = (keys: string[]) =>
			jsx('ul', { children: keys.map((key) => jsx('li', { ref: refs.get(key), children: key }, key)) });

		root.render(view(['a', 'b', 'c']));
		const items = Array.from(container.querySelectorAll('li'));
		root.render(view(['c', 'a', 'b']));

		expect(Array.from(container.querySelectorAll('li'))).toEqual([items[2], items[0], items[1]]);
		for (const [index, key] of ['a', 'b', 'c'].entries()) {
			expect(refs.get(key)!.mock.calls).toEqual([[items[index]]]);
		}

		root.render(view(['c', 'b']));

		expect(refs.get('a')!.mock.calls).toEqual([[items[0]], [null]]);
		expect(refs.get('b')!.mock.calls).toEqual([[items[1]]]);
	});

	test('a custom element receives the node, not a ref property', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const ref = vi.fn();

		createRoot(container).render(jsx('radiant-jsx-ref-host', { ref }));

		const host = container.querySelector('radiant-jsx-ref-host') as RefHostElement;
		expect(ref.mock.calls).toEqual([[host]]);
		expect(host.ref).toBeUndefined();
	});

	test('is an ordinary prop for a function component', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const ref = vi.fn();
		const Field = (props: { ref: (node: HTMLElement | null) => void }) => jsx('input', { ref: props.ref });

		createRoot(container).render(jsx(Field, { ref }));

		expect(ref).toHaveBeenCalledWith(container.querySelector('input'));
	});

	test('a ref that is gained and then dropped attaches and detaches it', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const ref = vi.fn();

		root.render(jsx('p', { id: 'x' }));
		const node = container.querySelector('p');
		root.render(jsx('p', { id: 'x', ref }));
		root.render(jsx('p', { id: 'x' }));

		expect(container.querySelector('p')).toBe(node);
		expect(ref.mock.calls).toEqual([[node], [null]]);
	});

	test('hydrate mode: the callback receives the server node', async () => {
		const [{ jsx, jsxs }, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
		const container = document.createElement('div');
		const ref = vi.fn();
		const hostRef = vi.fn();
		const view = () =>
			jsxs('section', {
				children: [
					jsx('input', { class: 'field', ref }),
					jsx('radiant-jsx-ref-host', { ref: hostRef, children: 'host' }),
				],
			});

		container.innerHTML = renderToString(view(), { mode: 'hydrate' });
		const serverInput = container.querySelector('input');
		const serverHost = container.querySelector('radiant-jsx-ref-host');
		expect(serverInput).not.toBeNull();
		expect(ref).not.toHaveBeenCalled();

		createRoot(container).hydrate(view());

		expect(container.querySelector('input')).toBe(serverInput);
		expect(ref.mock.calls).toEqual([[serverInput]]);
		expect(hostRef.mock.calls).toEqual([[serverHost]]);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind');
	});

	test('hydrate mode: a ref on the only dynamic part of a row still hydrates, with later markers in place', async () => {
		const [{ jsx, jsxs }, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
		const container = document.createElement('div');
		const ref = vi.fn();
		const onClick = vi.fn();
		const view = () =>
			jsxs('div', {
				children: [jsx('input', { ref }), jsx('button', { 'on:click': onClick, children: 'go' })],
			});

		container.innerHTML = renderToString(view(), { mode: 'hydrate' });
		const serverInput = container.querySelector('input');
		createRoot(container).hydrate(view());
		container.querySelector('button')!.click();

		expect(ref.mock.calls).toEqual([[serverInput]]);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test('hydrate mode: a ref under a reactive root receives the server node', async () => {
		const [{ jsx }, { createRoot }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
			loadServerRender(),
		]);
		const container = document.createElement('div');
		const ref = vi.fn();
		const view = () => jsx('input', { class: 'field', ref });
		const source = { get: view, subscribe: () => () => {} };

		container.innerHTML = renderToString(view(), { mode: 'hydrate' });
		const serverInput = container.querySelector('input');
		createRoot(container).hydrate(source);

		expect(container.querySelector('input')).toBe(serverInput);
		expect(ref.mock.calls).toEqual([[serverInput]]);
	});

	describe('order', () => {
		test('attaches child refs before the parent ref, siblings in document order', async () => {
			const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const log: string[] = [];
			const ref = (name: string) => (node: Element | null) => {
				log.push(`${name}:${node ? 'attach' : 'detach'}`);
			};

			createRoot(container).render(
				jsx('div', {
					ref: ref('root'),
					children: jsxs('section', {
						ref: ref('section'),
						children: [
							jsx('p', { ref: ref('a'), children: jsx('b', { ref: ref('a-child') }) }),
							jsx('p', { ref: ref('b') }),
						],
					}),
				}),
			);

			expect(log).toEqual(['a-child:attach', 'a:attach', 'b:attach', 'section:attach', 'root:attach']);
		});

		test('a parent ref sees its descendants already attached, on a custom element too', async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const attached = new Set<Element>();
			let seenByHost: boolean | undefined;

			createRoot(container).render(
				jsx('radiant-jsx-ref-host', {
					ref: () => {
						seenByHost = attached.has(container.querySelector('span')!);
					},
					children: jsx('span', { ref: (node: Element | null) => node && attached.add(node) }),
				}),
			);

			expect(seenByHost).toBe(true);
		});

		test('detaches the parent ref before the child ref', async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const root = createRoot(container);
			const log: string[] = [];
			const ref = (name: string) => (node: Element | null) => {
				if (!node) log.push(name);
			};

			root.render(jsx('div', { ref: ref('parent'), children: jsx('p', { ref: ref('child') }) }));
			root.unmount();

			expect(log).toEqual(['parent', 'child']);
		});

		test('refs inside a list under a parent ref attach before the parent', async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const log: string[] = [];

			createRoot(container).render(
				jsx('ul', {
					ref: () => log.push('list'),
					children: ['a', 'b'].map((name) => jsx('li', { ref: () => log.push(name) })),
				}),
			);

			expect(log).toEqual(['a', 'b', 'list']);
		});

		test('hydrate mode attaches child refs before the parent ref', async () => {
			const [{ jsx }, { createRoot }, { renderToString }] = await Promise.all([
				loadJsxRuntime(),
				loadJsxModule(),
				loadServerRender(),
			]);
			const container = document.createElement('div');
			const log: string[] = [];
			const view = () =>
				jsx('div', {
					ref: () => log.push('parent'),
					children: jsx('p', { ref: () => log.push('child') }),
				});

			container.innerHTML = renderToString(view(), { mode: 'hydrate' });
			createRoot(container).hydrate(view());

			expect(log).toEqual(['child', 'parent']);
		});
	});

	describe('errors', () => {
		let errors: unknown[];

		beforeEach(() => {
			errors = [];
			vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
				try {
					callback();
				} catch (error) {
					errors.push(error);
				}
			});
			return () => vi.restoreAllMocks();
		});

		test('a throwing callback is reported and later refs in the flush still run', async () => {
			const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const boom = new Error('boom');
			const later = vi.fn();

			createRoot(container).render(
				jsxs('div', {
					children: [
						jsx('p', {
							ref: () => {
								throw boom;
							},
						}),
						jsx('span', { ref: later }),
					],
				}),
			);

			expect(later).toHaveBeenCalledTimes(1);
			expect(errors).toEqual([boom]);
		});

		test('a throwing child callback still lets its ancestors attach, in order', async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const boom = new Error('child');
			const log: string[] = [];

			createRoot(container).render(
				jsx('div', {
					ref: () => log.push('root'),
					children: jsx('section', {
						ref: () => log.push('section'),
						children: jsx('p', {
							ref: () => {
								throw boom;
							},
						}),
					}),
				}),
			);

			expect(log).toEqual(['section', 'root']);
			expect(errors).toEqual([boom]);
		});

		test('a callback that throws on detach is reported, including after it threw on attach', async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const root = createRoot(container);
			const attach = new Error('attach');
			const detach = new Error('detach');

			root.render(
				jsx('p', {
					ref: (node: Element | null) => {
						throw node ? attach : detach;
					},
				}),
			);
			root.unmount();

			expect(errors).toEqual([attach, detach]);
		});

		test('a throwing cleanup is reported and the rest of the disposal still runs', async () => {
			const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const root = createRoot(container);
			const boom = new Error('cleanup');
			const second = vi.fn();

			root.render(
				jsxs('div', {
					children: [
						jsx('p', {
							ref: () => () => {
								throw boom;
							},
						}),
						jsx('span', { ref: second }),
					],
				}),
			);
			root.unmount();

			expect(second).toHaveBeenCalledTimes(2);
			expect(second).toHaveBeenLastCalledWith(null);
			expect(errors).toEqual([boom]);
		});

		test('a callback that threw is not called again, is called with null on detach, and a new callback attaches', async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const root = createRoot(container);
			const failing = vi.fn((node: Element | null) => {
				if (node) throw new Error('attach');
			});
			const next = vi.fn();

			root.render(jsx('p', { ref: failing }));
			root.render(jsx('p', { ref: failing }));
			const node = container.querySelector('p');
			root.render(jsx('p', { ref: next }));

			expect(failing.mock.calls).toEqual([[node], [null]]);
			expect(next.mock.calls).toEqual([[node]]);
			expect(errors).toHaveLength(1);
		});
	});
});
