// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { jsx, unsafeHtml, type JsxRenderable } from '@ecopages/jsx';
import { renderServerLightDom, renderToString } from '@ecopages/jsx/server';
import { describe, expect, test } from 'vitest';
import { MinimalTextNode } from '../../src/server/shim/minimal-dom/nodes';

/**
 * Parity between the light-DOM node builder and the string serializer it replaces for custom-element children.
 *
 * @remarks Seeded JSX trees are rendered both ways and compared as parsed trees (node types, names, attribute
 * values, text), so equivalent attribute spellings (`hidden` vs `hidden=""`) match. Text is compared as written,
 * not decoded, so an escaping difference fails. Raw-text tags (`style`, `xmp`, …) may hold `&`, `<`, `>` and
 * `</style`: both paths keep that text raw in HTML and entity-escape it inside `svg` or `math`.
 */

const CASES = 500;
const TEXT_PIECES = ['Terms', ' ', '&', '<b>', '>', '"q"', "'", '&amp;', ' ', '[{"type":1}]', '</script>', '0'];
const STYLE_TEXT_PIECES = [
	'.a > .b { color: red; }',
	'.a{}</style><script>x</script>',
	'a & b < c > d',
	'@media (width < 600px) { p { color: red } }',
	'.x{fill:red}<img id="pwn" src="x">}',
];
const RAW_TEXT_TAGS = ['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes'];

type Random = () => number;

function createRandom(seed: number): Random {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(random: Random, items: readonly T[]): T {
	return items[Math.floor(random() * items.length)] as T;
}

function text(random: Random): string {
	return Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(random, TEXT_PIECES)).join('');
}

function attributes(random: Random): Record<string, unknown> {
	const props: Record<string, unknown> = {};
	if (random() < 0.4) props.title = text(random);
	if (random() < 0.3) props['data-rules'] = JSON.stringify([{ type: text(random) }]);
	if (random() < 0.2) props.class = pick(random, ['a b', '', 'x"y']);
	if (random() < 0.2) props.hidden = random() < 0.5;
	if (random() < 0.2) props.style = pick(random, [{ color: 'red', 'font-size': '1px' }, 'color: blue', '']);
	if (random() < 0.2) props['on:click'] = () => undefined;
	if (random() < 0.1) props['prop:payload'] = { a: 1 };
	if (random() < 0.1) props['aria-label'] = null;
	return props;
}

function signalLike(value: string): JsxRenderable {
	return { get: () => value, subscribe: () => () => undefined } as unknown as JsxRenderable;
}

function rawTextElement(random: Random): JsxRenderable {
	return jsx(pick(random, RAW_TEXT_TAGS), { children: pick(random, STYLE_TEXT_PIECES) });
}

function element(random: Random, depth: number): JsxRenderable {
	const tag = pick(random, ['div', 'span', 'p', 'b', 'section']);
	const key = random() < 0.1 ? 'k' : undefined;
	return jsx(tag, { ...attributes(random), key, children: tag === 'p' ? text(random) : children(random, depth + 1) });
}

/** Weighted node builders: each entry's weight is its share of the draw. */
const NODE_BUILDERS: ReadonlyArray<readonly [number, (random: Random, depth: number) => JsxRenderable]> = [
	[25, (random) => text(random)],
	[5, (random) => Math.floor(random() * 100)],
	[3, (random) => pick(random, [null, false, true, undefined] as JsxRenderable[])],
	[4, (random) => signalLike(text(random))],
	[3, () => unsafeHtml('<i title="t &amp; u">trusted &lt;i&gt;</i>')],
	[5, (random, depth) => children(random, depth + 1)],
	[5, (random) => jsx(pick(random, ['br', 'input', 'img']), attributes(random))],
	[3, (random) => jsx('textarea', { children: text(random) })],
	[2, (random) => jsx('title', { children: text(random) })],
	[2, (random) => jsx('script', { type: 'application/json', children: text(random) })],
	[2, (random) => jsx('style', { children: pick(random, STYLE_TEXT_PIECES) })],
	[3, () => jsx('svg', { viewBox: '0 0 1 1', children: jsx('path', { d: 'M0 0' }) })],
	[4, (random) => jsx(pick(random, ['svg', 'math']), { children: rawTextElement(random) })],
	[2, (random) => jsx('svg', { children: jsx('foreignObject', { children: rawTextElement(random) }) })],
	[4, (random, depth) => jsx('ul', { children: [jsx('li', { children: children(random, depth + 1) })] })],
	[34, element],
];

const TOTAL_WEIGHT = NODE_BUILDERS.reduce((total, [weight]) => total + weight, 0);

function node(random: Random, depth: number): JsxRenderable {
	if (depth > 3) return text(random);

	let draw = random() * TOTAL_WEIGHT;

	for (const [weight, build] of NODE_BUILDERS) {
		draw -= weight;
		if (draw < 0) return build(random, depth);
	}

	return text(random);
}

function children(random: Random, depth: number): JsxRenderable {
	return Array.from({ length: 1 + Math.floor(random() * 3) }, () => node(random, depth));
}

type Described = unknown[];

function describeHtml(html: string): Described {
	const container = document.createElement('div');
	container.innerHTML = html;
	return describeChildren(container);
}

function describeChildren(parent: Node): Described {
	return Array.from(parent.childNodes, (child) => {
		if (child instanceof MinimalTextNode) return [child.nodeType, child.sourceHtml ?? child.textContent];
		if (child.nodeType !== 1) return [child.nodeType, child.textContent];
		const element = child as Element;
		return [
			element.localName,
			element.getAttributeNames().map((name) => [name, element.getAttribute(name)]),
			describeChildren(element),
		];
	});
}

function renderWithBuilder(value: JsxRenderable): string {
	const container = document.createElement('div');
	container.append(...renderServerLightDom(value, document));
	return container.innerHTML;
}

describe('light-DOM builder matches the string serializer', () => {
	test('on generated JSX trees', () => {
		for (let seed = 1; seed <= CASES; seed += 1) {
			const tree = children(createRandom(seed), 0);
			const serialized = renderToString(tree);
			const built = renderWithBuilder(tree);

			expect(describeHtml(built), `seed ${seed}\nserializer: ${serialized}\nbuilder: ${built}`).toEqual(
				describeHtml(serialized),
			);
		}
	});

	test('keeps style text raw on both paths', () => {
		const tree = jsx('style', { children: '.a > .b { content: "&" }' });
		expect(renderWithBuilder(tree)).toBe('<style>.a > .b { content: "&" }</style>');
		expect(renderToString(tree)).toBe('<style>.a > .b { content: "&" }</style>');
	});

	test('escapes style text inside svg and math on both paths', () => {
		for (const root of ['svg', 'math']) {
			const tree = jsx(root, { children: jsx('style', { children: '<img id="pwn" src="x">' }) });
			const expected = `<${root}><style>&lt;img id="pwn" src="x"&gt;</style></${root}>`;
			expect(renderWithBuilder(tree)).toBe(expected);
			expect(renderToString(tree)).toBe(expected);
		}
	});

	test('never parses dynamic text', () => {
		const built = renderWithBuilder(jsx('div', { title: '<b x="1">', children: '<img src=x onerror=alert(1)>' }));
		expect(built).toBe('<div title="&lt;b x=&quot;1&quot;&gt;">&lt;img src=x onerror=alert(1)&gt;</div>');
	});
});
