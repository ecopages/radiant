import { beforeEach, describe, expect, test } from 'vitest';
import {
	HYDRATE_SCRIPT_HTML,
	HYDRATE_STYLE_HTML,
	HYDRATE_TEXTAREA_ESCAPED_HTML,
	HYDRATE_TEXTAREA_HTML,
	HYDRATE_TITLE_HTML,
} from './fixtures/hydrate-html.ts';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');

const TEXT_CONTENT_TAGS = ['textarea', 'title', 'style', 'script'] as const;

function expectNoInternalMarkers(element: Element): void {
	expect(element.textContent).not.toContain('radiant-jsx-child');
	expect(element.innerHTML).not.toContain('radiant-jsx-child');
}

describe('Radiant JSX text-content elements', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test.each(TEXT_CONTENT_TAGS)('mounts %s children as character data, not comment markers', async (tagName) => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const props = tagName === 'script' ? { type: 'application/json', children: 'hello' } : { children: 'hello' };

		root.render(jsx(tagName, props));

		const element = container.querySelector(tagName);
		expect(element).not.toBeNull();
		expect(element?.textContent).toBe('hello');
		expectNoInternalMarkers(element!);

		if (element instanceof HTMLTextAreaElement) {
			expect(element.value).toBe('hello');
			expect(element.defaultValue).toBe('hello');
		}
	});

	test.each(TEXT_CONTENT_TAGS)('updates %s children in place', async (tagName) => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const renderView = (label: string) =>
			jsx(tagName, tagName === 'script' ? { type: 'application/json', children: label } : { children: label });

		root.render(renderView('hello'));
		const element = container.querySelector(tagName);
		root.render(renderView('world'));

		expect(container.querySelector(tagName)).toBe(element);
		expect(element?.textContent).toBe('world');
		expectNoInternalMarkers(element!);

		if (element instanceof HTMLTextAreaElement) {
			expect(element.value).toBe('world');
			expect(element.defaultValue).toBe('world');
		}
	});

	test('hydrates textarea children without rewriting them as markers', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		container.innerHTML = HYDRATE_TEXTAREA_HTML;
		const textarea = container.querySelector('textarea');
		root.hydrate(jsx('textarea', { id: 'draft', children: 'hello' }));

		expect(container.querySelector('textarea')).toBe(textarea);
		expect(textarea?.value).toBe('hello');
		expect(textarea?.defaultValue).toBe('hello');
		expectNoInternalMarkers(textarea!);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');

		root.render(jsx('textarea', { id: 'draft', children: 'world' }));
		expect(container.querySelector('textarea')).toBe(textarea);
		expect(textarea?.value).toBe('world');
		expect(textarea?.defaultValue).toBe('world');
	});

	test('hydrates title, style, and script children as character data', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const cases = [
			{ html: HYDRATE_TITLE_HTML, tagName: 'title', view: jsx('title', { id: 'page', children: 'hello' }) },
			{ html: HYDRATE_STYLE_HTML, tagName: 'style', view: jsx('style', { id: 'theme', children: 'hello' }) },
			{
				html: HYDRATE_SCRIPT_HTML,
				tagName: 'script',
				view: jsx('script', { type: 'application/json', children: 'hello' }),
			},
		] as const;

		for (const nextCase of cases) {
			const container = document.createElement('div');
			const root = createRoot(container);
			container.innerHTML = nextCase.html;
			const element = container.querySelector(nextCase.tagName);

			root.hydrate(nextCase.view);

			expect(container.querySelector(nextCase.tagName)).toBe(element);
			expect(element?.textContent).toBe('hello');
			expectNoInternalMarkers(element!);
			expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');
		}
	});

	test('escapes textarea and title children on mount and after hydration', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const escaped = 'a < b & "c"';
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(jsx('textarea', { id: 'draft', children: escaped }));
		const mountedTextarea = container.querySelector('textarea');
		expect(mountedTextarea?.value).toBe(escaped);
		expect(mountedTextarea?.defaultValue).toBe(escaped);
		expectNoInternalMarkers(mountedTextarea!);

		root.render(jsx('title', { id: 'page', children: escaped }));
		const mountedTitle = container.querySelector('title');
		expect(mountedTitle?.textContent).toBe(escaped);
		expectNoInternalMarkers(mountedTitle!);

		container.innerHTML = HYDRATE_TEXTAREA_ESCAPED_HTML;
		root.hydrate(jsx('textarea', { id: 'draft', children: escaped }));
		const hydrated = container.querySelector('textarea');
		expect(hydrated?.value).toBe(escaped);
		expect(hydrated?.defaultValue).toBe(escaped);
		expectNoInternalMarkers(hydrated!);
	});

	test('concatenates sibling textarea children and updates a reactive slot', async () => {
		const [{ createSubscribableJsxValue, jsxs }, { createRoot }] = await Promise.all([
			loadJsxRuntime(),
			loadJsxModule(),
		]);
		const container = document.createElement('div');
		const root = createRoot(container);
		const subscribers = new Set<(value: string) => void>();
		let suffix = 'lo';
		const boundSuffix = createSubscribableJsxValue({
			getValue: () => suffix,
			subscribe: (notify) => {
				subscribers.add(notify);
				return () => {
					subscribers.delete(notify);
				};
			},
		});

		root.render(jsxs('textarea', { children: ['hel', boundSuffix] }));
		const textarea = container.querySelector('textarea');
		expect(textarea?.value).toBe('hello');

		suffix = 'ium';
		for (const subscriber of subscribers) {
			subscriber(suffix);
		}
		await Promise.resolve();

		expect(textarea?.value).toBe('helium');
		expect(textarea?.defaultValue).toBe('helium');
		expect(subscribers.size).toBe(1);

		root.unmount();
		expect(subscribers.size).toBe(0);
	});

	test('preserves textarea edits when authored children are unchanged', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(jsx('textarea', { id: 'draft', children: 'initial' }));
		const textarea = container.querySelector('textarea');
		expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
		expect(textarea?.value).toBe('initial');
		expect(textarea?.defaultValue).toBe('initial');

		textarea!.value = 'typed';
		root.render(jsx('textarea', { id: 'draft', children: 'initial' }));

		expect(container.querySelector('textarea')).toBe(textarea);
		expect(textarea?.value).toBe('typed');
		expect(textarea?.defaultValue).toBe('initial');

		root.render(jsx('textarea', { id: 'draft', children: 'changed' }));
		expect(container.querySelector('textarea')).toBe(textarea);
		expect(textarea?.value).toBe('changed');
		expect(textarea?.defaultValue).toBe('changed');
	});
});
