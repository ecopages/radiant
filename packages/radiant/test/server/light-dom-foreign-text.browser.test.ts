import { jsx } from '@ecopages/jsx';
import { renderServerLightDom } from '@ecopages/jsx/server';
import { describe, expect, test } from 'vitest';
import { MinimalDocument } from '../../src/server/shim/minimal-dom/document';
import '../../src/server/shim/minimal-dom/html';

/**
 * Authored Children text in `style`, `xmp` and other raw-text tag names, serialized by the SSR minimal DOM and
 * parsed back by Chromium.
 */

const minimalDocument = new MinimalDocument() as unknown as Document;

function serializeLightDom(children: Parameters<typeof renderServerLightDom>[0]): string {
	const host = minimalDocument.createElement('x-host');
	host.append(...renderServerLightDom(children, minimalDocument));
	return host.innerHTML;
}

function parse(html: string): Document {
	return new DOMParser().parseFromString(`<body>${html}`, 'text/html');
}

describe('light-DOM SSR text in foreign content', () => {
	test.each([
		['svg', 'style'],
		['svg', 'xmp'],
		['math', 'style'],
		['math', 'noframes'],
	] as const)('%s %s text cannot create elements', (root, tag) => {
		const text = '<img id="pwn" src="x">';
		const parsed = parse(serializeLightDom(jsx(root, { children: jsx(tag, { children: text }) })));

		expect(parsed.querySelector('img')).toBeNull();
		expect(parsed.querySelector(`${root} > ${tag}`)?.textContent).toBe(text);
	});

	test.each(['svg', 'math'] as const)('%s text split across text nodes cannot create elements', (root) => {
		const style = minimalDocument.createElement('style');
		style.append('.x{}<im', 'g id="pwn" src="x">');
		const svg = minimalDocument.createElement(root);
		svg.append(style);
		const parsed = parse(svg.outerHTML);

		expect(parsed.querySelector('img')).toBeNull();
		expect(parsed.querySelector(`${root} > style`)?.textContent).toBe('.x{}<img id="pwn" src="x">');
	});

	test('style in svg foreignObject stays raw CSS', () => {
		const css = '@media (width < 600px) { p { color: red } }';
		const html = serializeLightDom(
			jsx('svg', { children: jsx('foreignObject', { children: jsx('style', { children: css }) }) }),
		);

		expect(html).toBe(`<svg><foreignobject><style>${css}</style></foreignobject></svg>`);
		expect(parse(html).querySelector('foreignObject > style')?.textContent).toBe(css);
	});

	test.each([
		['math', 'mi', 'mglyph', 'style'],
		['math', 'mi', 'malignmark', 'xmp'],
		['math', 'mtext', 'mglyph', 'noframes'],
		['math', 'foreignObject', 'style'],
	])('%s > %s > %s text cannot create elements', (...path) => {
		const tag = path[path.length - 1] as string;
		const text = `<img id="pwn" src="x"></${tag}><b>`;
		const tree = path.reduceRight<Parameters<typeof renderServerLightDom>[0]>(
			(children, name) => jsx(name, { children }),
			text,
		);
		const parsed = parse(serializeLightDom(tree));

		expect(parsed.querySelector('img, b')).toBeNull();
		expect(parsed.querySelector(path.join(' > '))?.textContent).toBe(text);
	});

	test('style text under math > mi is escaped like the rest of math', () => {
		const html = serializeLightDom(
			jsx('math', { children: jsx('mi', { children: jsx('style', { children: '<img id="pwn" src="x">' }) }) }),
		);

		expect(html).toBe('<math><mi><style>&lt;img id="pwn" src="x"&gt;</style></mi></math>');
		expect(parse(html).querySelector('img')).toBeNull();
	});

	test('parsed style text in svg keeps its meaning when the element changes', () => {
		const host = minimalDocument.createElement('div');
		host.innerHTML = '<svg><style>a&amp;b</style></svg>';
		const style = host.querySelector('style') as HTMLStyleElement;
		style.append('c');
		const parsed = parse(host.innerHTML);

		expect(style.textContent).toBe('a&bc');
		expect(parsed.querySelector('svg > style')?.textContent).toBe('a&bc');
	});
});

describe('light-DOM SSR text in HTML raw-text elements', () => {
	test('style text with a range media query is emitted unchanged', () => {
		const css = '@media (width < 600px) { p { color: red } }';
		const html = serializeLightDom(jsx('style', { children: css }));

		expect(html).toBe(`<style>${css}</style>`);
		expect(parse(html).querySelector('style')?.textContent).toBe(css);
	});

	test('only the closing tag of the element is rewritten', () => {
		const css = '.a{} </styles> </STYLE ><img id="pwn" src="x">';
		const html = serializeLightDom(jsx('style', { children: css }));

		expect(html).toBe('<style>.a{} </styles> <\\/STYLE ><img id="pwn" src="x"></style>');
		expect(parse(html).querySelector('img')).toBeNull();
	});

	test('a closing tag split across text nodes cannot end the element', () => {
		const style = minimalDocument.createElement('style');
		style.append('.a{}<', '/style><img id="pwn" src="x">');
		const parsed = parse(style.outerHTML);

		expect(parsed.querySelector('img')).toBeNull();
		expect(parsed.querySelector('style')?.textContent).toBe('.a{}<\\/style><img id="pwn" src="x">');
	});
});
