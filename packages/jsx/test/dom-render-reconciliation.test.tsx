import { beforeEach, describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../jsx-runtime.ts')>('../jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../index.ts')>('../index.ts');

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
		const subscribers = new Set<(value: import('../jsx-runtime.ts').JsxElement) => void>();
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
});
