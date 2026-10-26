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
		expect(parsed.querySelector('svg style')?.textContent).toBe('.x{fill:red}\\3c img id="pwn" src="x">}');
	});

	test('joining style children before escaping prevents a split closing tag', async () => {
		const [{ jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const html = renderToString(jsxs('style', { children: ['.a{}</', 'style><script>alert(1)</script>'] }));
		const container = document.createElement('div');
		container.innerHTML = html;

		expect(container.querySelector('script')).toBeNull();
		expect(container.querySelector('style')?.textContent).toBe('.a{}\\3c /style>\\3c script>alert(1)\\3c /script>');
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
