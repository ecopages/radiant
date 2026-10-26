import { describe, expect, test } from 'vitest';
import { createSubscribableJsxValue, Fragment, jsx, jsxs } from '../src/jsx-runtime.ts';
import { renderToString } from '../src/ssr/server-render.ts';
import {
	HYDRATE_ADJACENT_FIELDS_HTML,
	HYDRATE_BUTTON_ALPHA_HTML,
	HYDRATE_CARD_ALPHA_HTML,
	HYDRATE_CLASS_FORM_ELEMENT_HTML,
	HYDRATE_FRAGMENT_COUNTER_HTML,
	HYDRATE_GRADIENT_ICON_HTML,
	HYDRATE_ITERABLE_ROOT_HTML,
	HYDRATE_ITERABLE_ROOT_SINGLE_HTML,
	HYDRATE_METRIC_HTML,
	HYDRATE_NESTED_SVG_ICON_HTML,
	HYDRATE_TODO_ICON_BUTTON_HTML,
	HYDRATE_ITERABLE_NATIVE_CLICK_HTML,
	HYDRATE_TEXTAREA_HTML,
	HYDRATE_TEXTAREA_ESCAPED_HTML,
	HYDRATE_TITLE_HTML,
	HYDRATE_STYLE_HTML,
	HYDRATE_SCRIPT_HTML,
	HYDRATE_KEYED_INPUTS_HTML,
	HYDRATE_FRAGMENT_HOLE_HTML,
	HYDRATE_EMPTY_LIST_HTML,
	HYDRATE_ROOT_HOLES_HTML,
	HYDRATE_ROOT_LIST_HTML,
	HYDRATE_ROOT_EMPTY_ROWS_HTML,
	HYDRATE_UNREGISTERED_CUSTOM_ELEMENT_SIBLINGS_HTML,
	PLAIN_BUTTON_ALPHA_HTML,
	TRUE_CHILDREN_HTML,
} from './fixtures/hydrate-html.ts';

describe('hydrate HTML fixtures', () => {
	test('TRUE_CHILDREN_HTML matches renderToString', () => {
		expect(renderToString(jsx('p', { children: ['Before', true, 'After'] }))).toBe(TRUE_CHILDREN_HTML);
	});

	test('HYDRATE_NESTED_SVG_ICON_HTML matches renderToString', () => {
		const tree = jsx('button', {
			children: jsxs('svg', {
				viewBox: '0 0 24 24',
				children: [
					jsx('use', { 'xlink:href': '#alpha' }),
					jsx('path', { d: 'M18 6 6 18' }),
					jsx('foreignObject', {
						children: jsx('span', { class: 'foreign-object-label', children: 'HTML' }),
					}),
				],
			}),
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_NESTED_SVG_ICON_HTML);
	});

	test('HYDRATE_CLASS_FORM_ELEMENT_HTML matches the custom-element tag form', () => {
		const tree = jsx('main', {
			title: 'server',
			children: jsx('radiant-jsx-class-form-element', {
				id: 'card',
				children: jsx('span', { children: 'inside' }),
			}),
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_CLASS_FORM_ELEMENT_HTML);
	});

	test('HYDRATE_GRADIENT_ICON_HTML matches renderToString', () => {
		const tree = jsx('div', {
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

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_GRADIENT_ICON_HTML);
	});

	test('HYDRATE_ITERABLE_ROOT_HTML matches renderToString', () => {
		const tree = [
			jsx('button', { 'on:click': () => undefined, children: 'Alpha' }),
			jsx('button', { 'on:click': () => undefined, children: 'Beta' }),
		];

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_ITERABLE_ROOT_HTML);
	});

	test('HYDRATE_ITERABLE_ROOT_SINGLE_HTML matches renderToString', () => {
		const tree = [jsx('button', { class: 'alpha', 'on:click': () => undefined, children: 'Alpha' })];

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_ITERABLE_ROOT_SINGLE_HTML);
	});

	test('HYDRATE_BUTTON_ALPHA_HTML matches renderToString', () => {
		const tree = jsx('button', {
			class: 'action',
			hidden: false,
			'on:click': () => undefined,
			title: 'Alpha',
			children: 'Alpha',
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_BUTTON_ALPHA_HTML);
	});

	test('HYDRATE_CARD_ALPHA_HTML matches renderToString', () => {
		const tree = jsx('section', {
			children: jsxs('p', { children: ['Count: ', 'alpha'] }),
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_CARD_ALPHA_HTML);
	});

	test('PLAIN_BUTTON_ALPHA_HTML matches renderToString', () => {
		expect(renderToString(jsx('button', { class: 'action', children: 'alpha' }))).toBe(PLAIN_BUTTON_ALPHA_HTML);
	});

	test('HYDRATE_ADJACENT_FIELDS_HTML matches renderToString', () => {
		const tree = jsx('section', {
			children: [
				jsx('input', {
					'aria-label': 'Alpha',
					'data-id': 'alpha',
					hidden: false,
					title: 'Alpha',
					type: 'text',
				}),
				jsx('input', {
					'aria-label': 'Beta',
					'data-id': 'beta',
					hidden: false,
					title: 'Beta',
					type: 'text',
				}),
			],
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_ADJACENT_FIELDS_HTML);
	});

	test('HYDRATE_METRIC_HTML matches renderToString', () => {
		const boundCount = createSubscribableJsxValue({
			getValue: () => 15,
			subscribe: () => () => undefined,
		});
		const tree = jsxs('p', {
			class: 'component-metric',
			children: ['Count: ', boundCount],
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_METRIC_HTML);
	});

	test('HYDRATE_FRAGMENT_COUNTER_HTML matches renderToString', () => {
		const boundCount = createSubscribableJsxValue({
			getValue: () => 2,
			subscribe: () => () => undefined,
		});
		const tree = jsxs(Fragment, {
			children: [
				jsx('button', { id: 'dec', children: '-' }),
				jsx('span', { id: 'metric', children: boundCount }),
				jsx('button', { id: 'inc', children: '+' }),
			],
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_FRAGMENT_COUNTER_HTML);
	});

	test('HYDRATE_TODO_ICON_BUTTON_HTML matches renderToString', () => {
		const tree = jsxs(Fragment, {
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

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_TODO_ICON_BUTTON_HTML);
	});

	test('HYDRATE_ITERABLE_NATIVE_CLICK_HTML matches renderToString', () => {
		const tree = [
			jsx('button', { 'on-native:click': () => undefined, children: 'Alpha' }),
			jsx('button', { 'on-native:click': () => undefined, children: 'Beta' }),
		];

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_ITERABLE_NATIVE_CLICK_HTML);
	});

	test('HYDRATE_TEXTAREA_HTML matches renderToString', () => {
		expect(renderToString(jsx('textarea', { id: 'draft', children: 'hello' }), { mode: 'hydrate' })).toBe(
			HYDRATE_TEXTAREA_HTML,
		);
	});

	test('HYDRATE_TEXTAREA_ESCAPED_HTML matches renderToString', () => {
		expect(renderToString(jsx('textarea', { id: 'draft', children: 'a < b & "c"' }), { mode: 'hydrate' })).toBe(
			HYDRATE_TEXTAREA_ESCAPED_HTML,
		);
	});

	test('HYDRATE_TITLE_HTML matches renderToString', () => {
		expect(renderToString(jsx('title', { id: 'page', children: 'hello' }), { mode: 'hydrate' })).toBe(
			HYDRATE_TITLE_HTML,
		);
	});

	test('HYDRATE_STYLE_HTML matches renderToString', () => {
		expect(renderToString(jsx('style', { id: 'theme', children: 'hello' }), { mode: 'hydrate' })).toBe(
			HYDRATE_STYLE_HTML,
		);
	});

	test('HYDRATE_SCRIPT_HTML matches renderToString', () => {
		expect(
			renderToString(jsx('script', { type: 'application/json', children: 'hello' }), { mode: 'hydrate' }),
		).toBe(HYDRATE_SCRIPT_HTML);
	});

	test('HYDRATE_KEYED_INPUTS_HTML matches renderToString', () => {
		const tree = ['a', 'b'].map((id) => jsx('input', { key: id, id, type: 'text' }));

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_KEYED_INPUTS_HTML);
	});

	test('HYDRATE_FRAGMENT_HOLE_HTML matches renderToString', () => {
		const tree = jsx('main', {
			children: jsxs(Fragment, { children: [jsx('button', { class: 'save', children: 'Save' }), null] }),
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_FRAGMENT_HOLE_HTML);
	});

	test('HYDRATE_EMPTY_LIST_HTML matches renderToString', () => {
		expect(renderToString(jsx('section', { class: 'list', children: [] }), { mode: 'hydrate' })).toBe(
			HYDRATE_EMPTY_LIST_HTML,
		);
	});

	test('HYDRATE_ROOT_HOLES_HTML matches renderToString', () => {
		const tail = jsx('b', { class: 'tail', children: 'tail' });

		expect(renderToString(jsxs(Fragment, { children: [null, null, tail] }), { mode: 'hydrate' })).toBe(
			HYDRATE_ROOT_HOLES_HTML,
		);
		expect(renderToString(jsxs(Fragment, { children: [[], tail] }), { mode: 'hydrate' })).toBe(
			HYDRATE_ROOT_HOLES_HTML,
		);
	});

	test('HYDRATE_ROOT_LIST_HTML matches renderToString', () => {
		const tree = jsxs(Fragment, {
			children: [
				['a'].map((value) => jsx('li', { class: value, children: value })),
				jsx('b', { class: 'tail', children: 'tail' }),
			],
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_ROOT_LIST_HTML);
	});

	test('HYDRATE_UNREGISTERED_CUSTOM_ELEMENT_SIBLINGS_HTML matches renderToString', () => {
		const tree = jsxs('div', {
			children: [
				jsx('jsx-registered-marker-host', { label: 'registered' }),
				jsx('third-party-widget', {
					label: 'x',
					'on:change': () => undefined,
				}),
				jsx('button', { 'on:click': () => undefined, children: 'go' }),
			],
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_UNREGISTERED_CUSTOM_ELEMENT_SIBLINGS_HTML);
	});

	test('HYDRATE_ROOT_EMPTY_ROWS_HTML matches renderToString', () => {
		const Row = () => null;
		const tree = jsxs(Fragment, {
			children: [jsx('h1', { class: 'title', children: 'Rows' }), ['a'].map((key) => jsx(Row, {}, key))],
		});

		expect(renderToString(tree, { mode: 'hydrate' })).toBe(HYDRATE_ROOT_EMPTY_ROWS_HTML);
	});
});
