import { describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../jsx-runtime.ts')>('../jsx-runtime.ts');
const loadServerRender = async () => loadModule<typeof import('../server-render.ts')>('../server-render.ts');

describe('Radiant JSX server render', () => {
	test('serializes intrinsic elements and escapes text content', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('div', {
			class: 'counter',
			children: 'Hello <Radiant>',
		});

		expect(renderToString(template)).toBe('<div class="counter">Hello &lt;Radiant&gt;</div>');
	});

	test('serializes nested components and iterable children', async () => {
		const [{ jsx, jsxs }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);

		const Label = ({ text }: { text: string }) => jsx('strong', { children: text });
		const Card = ({ title, children }: { title: string; children: import('../jsx-runtime.ts').JsxChild }) =>
			jsxs('section', {
				children: ['Hello ', jsx(Label, { text: title }), ' ', children],
			});

		const template = jsx(Card, {
			title: 'SSR',
			children: [jsx('span', { children: 'ready' }), '!'],
		});

		expect(renderToString(template)).toBe('<section>Hello <strong>SSR</strong> <span>ready</span>!</section>');
	});

	test('serializes standard, boolean, style, data, and aria attributes', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('button', {
			hidden: true,
			style: { backgroundColor: 'tomato', paddingInline: '12px' },
			data: { tid: 'counter' },
			aria: { label: 'Increment' },
			children: '+',
		});

		expect(renderToString(template)).toBe(
			'<button hidden style="background-color: tomato; padding-inline: 12px" data-tid="counter" aria-label="Increment">+</button>',
		);
	});

	test('omits event and property bindings from serialized HTML', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('demo-card', {
			'on:click': () => undefined,
			'prop:payload': { count: 2 },
			title: 'Ready',
		});

		expect(renderToString(template)).toBe('<demo-card title="Ready"></demo-card>');
	});

	test('serializes void elements without closing tags', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('input', {
			type: 'text',
			value: 'hello',
		});

		expect(renderToString(template)).toBe('<input type="text" value="hello">');
	});

	test('preserves hydration markers when requested', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('button', {
			class: 'action',
			hidden: true,
			'on:click': () => undefined,
			children: 'Ship',
		});

		expect(renderToString(template, { hydrate: true })).toBe(
			'<button data-radiant-jsx-bind-0="attr:class" class="action" data-radiant-jsx-bind-1="bool:hidden" hidden data-radiant-jsx-bind-2="event:click">Ship</button>',
		);
	});
});
