import { expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');

/** Fills the module-level shape caches, so it lives in its own file and module instance. */
test('elements keep their nodes past the shape cache limits', async () => {
	const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
	const container = document.createElement('div');
	const root = createRoot(container);

	for (let index = 0; index < 10000; index += 1) jsx('div', { [`data-fill-${index}`]: 'x' });

	root.render(jsx('div', { 'data-after-cap': 'a', children: 'x' }));
	const first = container.firstElementChild;
	root.render(jsx('div', { 'data-after-cap': 'b', children: 'y' }));
	expect(container.firstElementChild).toBe(first);
	expect(first?.getAttribute('data-after-cap')).toBe('b');
	expect(first?.textContent).toBe('y');

	root.render(jsx('div', { 'data-other-after-cap': 'b', children: 'y' }));
	expect(container.firstElementChild).not.toBe(first);
});
