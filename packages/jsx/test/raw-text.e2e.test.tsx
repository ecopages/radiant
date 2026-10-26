import { state } from '@ecopages/signals';
import { beforeEach, describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');
const loadServerRender = async () =>
	loadModule<typeof import('../src/ssr/server-render.ts')>('../src/ssr/server-render.ts');

describe('Radiant JSX raw-text elements', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('style text in SVG cannot create HTML elements', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const css = '.x{fill:red}<img id="pwn" src="x">}';
		const html = renderToString(jsx('svg', { children: jsx('style', { children: css }) }));
		const parsed = new DOMParser().parseFromString(html, 'text/html');

		expect(parsed.querySelector('img')).toBeNull();
		expect(parsed.querySelector('svg style')?.textContent).toBe(css);
	});

	test.each(['desc', 'title'] as const)('style CSS in svg %s stays raw', async (point) => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const css = '@media (width < 600px) { p { color: red } }';
		const html = renderToString(
			jsx('svg', { children: jsx(point, { children: jsx('style', { children: css }) }) }),
		);
		const parsed = new DOMParser().parseFromString(html, 'text/html');

		expect(html).toBe(`<svg><${point}><style>${css}</style></${point}></svg>`);
		expect(parsed.querySelector('img')).toBeNull();
		expect(parsed.querySelector(`svg ${point} style`)?.textContent).toBe(css);
	});

	test('a foreignObject inside math stays foreign content', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const css = '.x{}<img id="pwn" src="x">';
		const html = renderToString(
			jsx('math', { children: jsx('foreignObject', { children: jsx('style', { children: css }) }) }),
		);
		const parsed = new DOMParser().parseFromString(html, 'text/html');

		expect(parsed.querySelector('img')).toBeNull();
		expect(parsed.querySelector('math style')?.textContent).toBe(css);
	});

	test('joining style children before escaping prevents a split closing tag', async () => {
		const [{ jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const html = renderToString(jsxs('style', { children: ['.a{}</', 'style><script>alert(1)</script>'] }));
		const container = document.createElement('div');
		container.innerHTML = html;

		expect(container.querySelector('script')).toBeNull();
		expect(container.querySelector('style')?.textContent).toBe('.a{}<\\/style><script>alert(1)</script>');
	});

	test.each(
		['svg', 'math'].flatMap((root) =>
			['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes'].map((tag) => [root, tag] as const),
		),
	)('%s %s text cannot create elements', async (root, tag) => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const text = `<img id="pwn" src="x"></${tag}><b>`;
		const html = renderToString(jsx(root, { children: jsx(tag, { children: text }) }));
		const parsed = new DOMParser().parseFromString(html, 'text/html');

		expect(parsed.querySelector('img, b')).toBeNull();
		expect(parsed.querySelector(`${root} > ${tag}`)?.textContent).toBe(text);
	});

	test.each([
		['a max-width range', '@media (width < 100000px) { .probe { color: rgb(255, 0, 0) } }', 'color', null],
		['a range using <=', '@media (1px <= width <= 100000px) { .probe { color: rgb(255, 0, 0) } }', 'color', null],
		['an escaped < in a string', '.probe::before { content: "\\<" }', 'content', '::before'],
	] as const)('style text with %s applies like the raw CSS', async (_name, css, property, pseudo) => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const readProbe = (styleHtml: string) => {
			const host = document.createElement('div');
			host.innerHTML = `${styleHtml}<p class="probe">x</p>`;
			document.body.append(host);
			const value = getComputedStyle(host.querySelector('.probe')!, pseudo).getPropertyValue(property);
			host.remove();
			return value;
		};
		const html = renderToString(jsx('style', { children: css }));
		const reference = document.createElement('style');
		reference.textContent = css;

		expect(html).toBe(reference.outerHTML);
		expect(readProbe(html)).toBe(readProbe(reference.outerHTML));
		expect(readProbe(html)).not.toBe(readProbe(''));
	});

	test.each(['style', 'script', 'xmp'] as const)('keeps %s signal children live', async (tagName) => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const value = state('a');
		let subscribers = 0;
		const signal = {
			get: () => value.get(),
			subscribe: (notify: (next: string) => void) => {
				subscribers += 1;
				const unsubscribe = value.subscribe(notify);
				return () => {
					subscribers -= 1;
					unsubscribe();
				};
			},
		};

		root.render(jsx(tagName, { children: signal }));
		const element = container.querySelector(tagName);
		expect(element?.textContent).toBe('a');
		expect(subscribers).toBe(1);

		value.set('b');
		await Promise.resolve();

		expect(element?.textContent).toBe('b');
		expect(subscribers).toBe(1);

		root.unmount();
		expect(subscribers).toBe(0);
	});
});

describe('custom elements inside foreign content', () => {
	const injected = '<img id="pwn" src="x">';
	const loadLightDom = async () =>
		loadModule<typeof import('../src/ssr/server-light-dom.ts')>('../src/ssr/server-light-dom.ts');

	class ForeignHookProbe extends HTMLElement {}
	class ForeignPlainProbe extends HTMLElement {}
	class ForeignHostProbe extends HTMLElement {
		renderHostToString(options?: { foreignContent?: string }) {
			return `<foreign-host-probe data-namespace="${options?.foreignContent ?? 'html'}">${this.innerHTML}</foreign-host-probe>`;
		}
	}
	customElements.define('foreign-hook-probe', ForeignHookProbe);
	customElements.define('foreign-plain-probe', ForeignPlainProbe);
	customElements.define('foreign-host-probe', ForeignHostProbe);

	function parse(html: string): Document {
		return new DOMParser().parseFromString(`<body>${html}`, 'text/html');
	}

	test('the render hook gets the namespace the element sits in', async () => {
		const [{ jsx, jsxs }, { renderToString, withServerCustomElementRenderHook }] = await Promise.all([
			loadJsxRuntime(),
			loadServerRender(),
		]);
		const probe = jsx('foreign-hook-probe', {});
		const seen: unknown[] = [];

		withServerCustomElementRenderHook(
			({ foreignContent }) => {
				seen.push(foreignContent);
				return undefined;
			},
			() =>
				renderToString(
					jsxs('div', {
						children: [
							probe,
							jsxs('svg', {
								children: [
									probe,
									jsx('g', { children: probe }),
									jsx('foreignObject', { children: probe }),
								],
							}),
							jsx('math', { children: jsx('mi', { children: probe }) }),
						],
					}),
				),
		);

		expect(seen).toEqual([undefined, 'svg', 'svg', undefined, 'math']);
	});

	test('svg desc and title are HTML for the hook; under math they stay foreign', async () => {
		const [{ jsx, jsxs }, { renderToString, withServerCustomElementRenderHook }] = await Promise.all([
			loadJsxRuntime(),
			loadServerRender(),
		]);
		const probe = jsx('foreign-hook-probe', {});
		const seen: unknown[] = [];

		withServerCustomElementRenderHook(
			({ foreignContent }) => {
				seen.push(foreignContent);
				return undefined;
			},
			() =>
				renderToString(
					jsxs('div', {
						children: [
							jsxs('svg', {
								children: [jsx('desc', { children: probe }), jsx('title', { children: probe })],
							}),
							jsx('math', { children: jsx('desc', { children: probe }) }),
						],
					}),
				),
		);

		expect(seen).toEqual([undefined, undefined, 'math']);
	});

	test.each(['svg', 'math'] as const)(
		'a hook view rendered with foreignContent %s cannot create elements',
		async (root) => {
			const [{ jsx, createMarkupNodeLike }, { renderToString, withServerCustomElementRenderHook }] =
				await Promise.all([loadJsxRuntime(), loadServerRender()]);
			const html = withServerCustomElementRenderHook(
				({ foreignContent }) =>
					createMarkupNodeLike(
						`<foreign-hook-probe>${renderToString(jsx('style', { children: injected }), { foreignContent })}</foreign-hook-probe>`,
					),
				() => renderToString(jsx(root, { children: jsx('foreign-hook-probe', {}) })),
			);
			const parsed = parse(html);

			expect(parsed.querySelector('img')).toBeNull();
			expect(parsed.querySelector(`${root} style`)?.textContent).toBe(injected);
		},
	);

	test('a hook view in HTML keeps raw CSS byte-identical', async () => {
		const [{ jsx, createMarkupNodeLike }, { renderToString, withServerCustomElementRenderHook }] =
			await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const css = '@media (width < 600px) { p { color: red } }';
		const html = withServerCustomElementRenderHook(
			({ foreignContent }) =>
				createMarkupNodeLike(
					`<foreign-hook-probe>${renderToString(jsx('style', { children: css }), { foreignContent })}</foreign-hook-probe>`,
				),
			() => renderToString(jsx('foreign-hook-probe', {})),
		);

		expect(html).toBe(`<foreign-hook-probe><style>${css}</style></foreign-hook-probe>`);
	});

	test.each(['svg', 'math'] as const)(
		'children of an SSR-capable element inside %s cannot create elements',
		async (root) => {
			const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
			const html = renderToString(
				jsx(root, { children: jsx('foreign-host-probe', { children: jsx('xmp', { children: injected }) }) }),
			);
			const parsed = parse(html);

			expect(parsed.querySelector('img')).toBeNull();
			expect(parsed.querySelector('foreign-host-probe')?.getAttribute('data-namespace')).toBe(root);
			expect(parsed.querySelector(`${root} xmp`)?.textContent).toBe(injected);
		},
	);

	test.each(['svg', 'math'] as const)(
		'children of an element without an SSR contract inside %s cannot create elements',
		async (root) => {
			const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
			const html = renderToString(
				jsx(root, {
					children: jsx('foreign-plain-probe', { children: jsx('noframes', { children: injected }) }),
				}),
			);
			const parsed = parse(html);

			expect(parsed.querySelector('img')).toBeNull();
			expect(parsed.querySelector(`${root} noframes`)?.textContent).toBe(injected);
		},
	);

	test('light-DOM nodes for svg parse a nested custom element as svg content', async () => {
		const [{ jsx }, { renderServerLightDom }] = await Promise.all([loadJsxRuntime(), loadLightDom()]);
		const [probe] = renderServerLightDom(
			jsx('foreign-plain-probe', { children: jsx('style', { children: injected }) }),
			document,
			'svg',
		) as Element[];

		expect(probe?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(probe?.querySelector('style')?.textContent).toBe(injected);
		expect(probe?.querySelector('img')).toBeNull();
	});
});
