import { describe, expect, test, vi } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../jsx-runtime.ts')>('../jsx-runtime.ts');
const loadJsxDevRuntime = async () => loadModule<typeof import('../jsx-dev-runtime.ts')>('../jsx-dev-runtime.ts');

function expectTemplateResultLike(value: unknown): asserts value is import('../jsx-runtime.ts').TemplateResultLike {
	expect(value).toEqual(
		expect.objectContaining({
			['_$rType$']: 1,
			strings: expect.any(Array),
			values: expect.any(Array),
		}),
	);
}

describe('Radiant JSX runtime', () => {
	test('jsx returns a renderer-agnostic template result for intrinsic elements', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('div', {
			class: 'counter',
			children: 'Hello JSX',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<div class=', '>', '</div>']);
		expect(result.values).toEqual(['counter', 'Hello JSX']);
	});

	test('jsxs preserves sibling child order as positional template values', async () => {
		const [{ jsxs }] = await Promise.all([loadJsxRuntime()]);
		const result = jsxs('section', {
			children: ['Hello ', jsxs('strong', { children: ['Radiant'] }), '!'],
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<section>', '', '', '</section>']);
		expect(result.values).toHaveLength(3);
		expect(result.values[0]).toBe('Hello ');
		expect(result.values[2]).toBe('!');
		expectTemplateResultLike(result.values[1]);
		expect(Array.from(result.values[1].strings)).toEqual(['<strong>', '</strong>']);
		expect(result.values[1].values).toEqual(['Radiant']);
	});

	test('jsx keeps iterable children grouped as a single child binding', async () => {
		const [{ jsx, isKeyedJsxValue }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('ul', {
			children: ['alpha', 'beta'].map((value) => jsx('li', { children: value, key: value })),
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<ul>', '</ul>']);
		expect(result.values).toHaveLength(1);
		expect(Array.isArray(result.values[0])).toBe(true);
		expect((result.values[0] as unknown[]).every((value) => isKeyedJsxValue(value))).toBe(true);
	});

	test('jsx preserves singleton iterables as iterable child bindings', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('ul', {
			children: ['alpha'].map((value) => jsx('li', { children: value })),
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<ul>', '</ul>']);
		expect(result.values).toHaveLength(1);
		expect(Array.isArray(result.values[0])).toBe(true);
		expect(result.values[0] as unknown[]).toHaveLength(1);
	});

	test('function components receive props and children', async () => {
		const [{ jsx, jsxs }] = await Promise.all([loadJsxRuntime()]);

		const Card = ({ title, children }: { title: string; children: import('../jsx-runtime.ts').JsxChild }) =>
			jsxs('article', {
				class: 'card',
				children: [jsx('h2', { children: title }), children],
			});

		const result = jsx(Card, { title: 'Overview', children: jsx('p', { children: 'Body copy' }) });

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<article class=', '>', '', '</article>']);
		expect(result.values[0]).toBe('card');
		expectTemplateResultLike(result.values[1]);
		expectTemplateResultLike(result.values[2]);
	});

	test('function component props can be passed through and rendered by children', async () => {
		const [{ jsx, jsxs }] = await Promise.all([loadJsxRuntime()]);

		const Label = ({ text }: { text: string }) => jsx('span', { class: 'label', children: text });
		const Field = ({ label, value }: { label: string; value: string }) =>
			jsxs('label', {
				class: 'field',
				children: [jsx(Label, { text: label }), jsx('strong', { children: value })],
			});
		const SummaryCard = ({ title, value }: { title: string; value: string }) =>
			jsx('section', {
				children: jsx(Field, {
					label: title,
					value,
				}),
			});

		const result = jsx(SummaryCard, { title: 'Status', value: 'Ready' });

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<section>', '</section>']);
		expectTemplateResultLike(result.values[0]);
		expect(Array.from(result.values[0].strings)).toEqual(['<label class=', '>', '', '</label>']);
		expect(result.values[0].values[0]).toBe('field');
		expectTemplateResultLike(result.values[0].values[1]);
		expectTemplateResultLike(result.values[0].values[2]);
	});

	test('classes merges strings, arrays, objects, and numbers like clsx', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('div', {
			class: 'panel',
			className: ['stack', false, 'wide'],
			classes: ['surface', { active: true, muted: false }, ['nested', 2, 0], true],
			children: 'Ready',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<div class=', '>', '</div>']);
		expect(result.values).toEqual(['panel stack wide surface active nested 2 0', 'Ready']);
	});

	test('on:event encodes a native event listener binding', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const handleClick = vi.fn();
		const result = jsx('button', {
			'on:click': handleClick,
			children: 'Increment',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<button @click=', '>', '</button>']);
		expect(result.values).toEqual([handleClick, 'Increment']);
	});

	test('prop:name encodes a property binding without stringifying the value', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const payload = { value: 1 };
		const result = jsx('property-receiver', {
			'prop:payload': payload,
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<property-receiver .payload=', '></property-receiver>']);
		expect(result.values).toEqual([payload]);
	});

	test('boolean, data, and aria bindings encode the expected template syntax', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('button', {
			hidden: true,
			data: { tid: 'counter' },
			aria: { label: 'Decrement' },
			children: '-',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual([
			'<button ?hidden=',
			' data-tid=',
			' aria-label=',
			'>',
			'</button>',
		]);
		expect(result.values).toEqual([true, 'counter', 'Decrement', '-']);
	});

	test('jsxDEV delegates to the same template semantics', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const [{ jsxDEV }] = await Promise.all([loadJsxDevRuntime()]);
		const runtimeResult = jsx('div', { children: 'Dev runtime' });
		const devResult = jsxDEV('div', { children: 'Dev runtime' });

		expectTemplateResultLike(runtimeResult);
		expectTemplateResultLike(devResult);
		expect(Array.from(devResult.strings)).toEqual(Array.from(runtimeResult.strings));
		expect(devResult.values).toEqual(runtimeResult.values);
	});
});
