import { describe, expect, test, vi } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxDevRuntime = async () =>
	loadModule<typeof import('../src/jsx-dev-runtime.ts')>('../src/jsx-dev-runtime.ts');
const loadDevWarnings = async () =>
	loadModule<typeof import('../src/warnings/dev-warnings.ts')>('../src/warnings/dev-warnings.ts');

function expectTemplateResultLike(value: unknown): asserts value is import('../src/jsx-runtime.ts').TemplateResultLike {
	expect(value).toEqual(
		expect.objectContaining({
			['_$rType$']: 1,
			strings: expect.any(Array),
			values: expect.any(Array),
		}),
	);
}

describe('Radiant JSX runtime', () => {
	test('SSR treats nullish child content as empty', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([
			loadJsxRuntime(),
			loadModule<typeof import('../src/ssr/server-render.ts')>('../src/ssr/server-render.ts'),
		]);

		expect(renderToString(jsx('p', { children: undefined }))).toBe('<p></p>');
		expect(renderToString(jsx('p', { children: null }))).toBe('<p></p>');
	});

	test('dev warning helper supports global enablement and once-only warnings', async () => {
		const [
			{ resetRuntimeWarningsForTests, setDevWarningsEnabled },
			{ HYDRATION_INVALID_BINDING_INDEX_WARNING, warnRuntime },
		] = await Promise.all([loadJsxDevRuntime(), loadDevWarnings()]);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		resetRuntimeWarningsForTests();
		setDevWarningsEnabled(true);

		try {
			warnRuntime(HYDRATION_INVALID_BINDING_INDEX_WARNING, 'first', { code: 'alpha' });
			warnRuntime(HYDRATION_INVALID_BINDING_INDEX_WARNING, 'first', { code: 'alpha' });
			warnRuntime(HYDRATION_INVALID_BINDING_INDEX_WARNING, 'second', { code: 'beta', once: false });
			warnRuntime(HYDRATION_INVALID_BINDING_INDEX_WARNING, 'second', { code: 'beta', once: false });

			expect(warnSpy).toHaveBeenCalledTimes(3);
			warnSpy.mockClear();

			setDevWarningsEnabled(false);
			warnRuntime(HYDRATION_INVALID_BINDING_INDEX_WARNING, 'suppressed', { code: 'gamma' });
			expect(warnSpy).not.toHaveBeenCalled();
		} finally {
			resetRuntimeWarningsForTests();
			setDevWarningsEnabled(undefined);
			warnSpy.mockRestore();
		}
	});

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

	test('jsx collapses a singleton iterable inside a fragment to its only child', async () => {
		const [{ Fragment, jsx }] = await Promise.all([loadJsxRuntime()]);
		const single = jsx(Fragment, { children: ['alpha'] });

		// A fragment has no element to hang slots on, so a lone child renders as
		// itself — the opposite of the element case above, which keeps the list.
		expect(single).toBe('alpha');

		const many = jsx(Fragment, { children: ['alpha', 'beta'] });

		expect(many).toEqual(['alpha', 'beta']);
	});

	test('jsx drops true children the same way SSR does', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('div', {
			children: ['prefix', true, 'suffix'],
		});

		expectTemplateResultLike(result);
		expect(result.values).toEqual([['prefix', true, 'suffix']]);
	});

	test('function components receive props and children', async () => {
		const [{ jsx, jsxs }] = await Promise.all([loadJsxRuntime()]);

		const Card = ({
			title,
			children,
		}: {
			title: string;
			children: import('../src/jsx-runtime.ts').JsxRenderable;
		}) =>
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
			classes: ['stack', false, 'wide', 'surface', { active: true, muted: false }, ['nested', 2, 0], true],
			children: 'Ready',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<div class=', '>', '</div>']);
		expect(result.values).toEqual(['panel stack wide surface active nested 2 0', 'Ready']);
	});

	test('on:event encodes a delegated binding for supported bubbling events', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const handleClick = vi.fn();
		const result = jsx('button', {
			'on:click': handleClick,
			children: 'Increment',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<button !click=', '>', '</button>']);
		expect(result.values).toEqual([handleClick, 'Increment']);
	});

	test('on:event encodes a direct binding when the event is outside the delegated allowlist', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const handleChange = vi.fn();
		const result = jsx('button', {
			'on:change': handleChange,
			children: 'Save',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<button @change=', '>', '</button>']);
		expect(result.values).toEqual([handleChange, 'Save']);
	});

	test('on-native:event always encodes a direct event listener binding', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const handleClick = vi.fn();
		const result = jsx('button', {
			'on-native:click': handleClick,
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

	test('custom elements default non-allowlisted props to property bindings', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const items = [{ id: 1 }];
		const result = jsx('property-receiver', {
			items,
			id: 'receiver',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<property-receiver .items=', ' id=', '></property-receiver>']);
		expect(result.values).toEqual([items, 'receiver']);
	});

	test('attr:name encodes an explicit attribute binding with the stripped name', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('property-receiver', {
			'attr:value': 'draft',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<property-receiver value=', '></property-receiver>']);
		expect(result.values).toEqual(['draft']);
	});

	test('native intrinsic elements keep unprefixed props as attribute bindings', async () => {
		const [{ jsx }] = await Promise.all([loadJsxRuntime()]);
		const result = jsx('button', {
			type: 'button',
			children: 'Save',
		});

		expectTemplateResultLike(result);
		expect(Array.from(result.strings)).toEqual(['<button type=', '>', '</button>']);
		expect(result.values).toEqual(['button', 'Save']);
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

	test('jsx third-arg key matches props key for automatic runtime emit', async () => {
		const [{ jsx, isKeyedJsxValue }] = await Promise.all([loadJsxRuntime()]);
		const fromProps = jsx('li', { children: 'alpha', key: 'a' });
		const fromArg = jsx('li', { children: 'alpha' }, 'a');

		expect(isKeyedJsxValue(fromProps)).toBe(true);
		expect(isKeyedJsxValue(fromArg)).toBe(true);
		if (isKeyedJsxValue(fromProps) && isKeyedJsxValue(fromArg)) {
			expect(fromArg.key).toBe(fromProps.key);
		}
	});
});
