import { describe, expect, test } from 'vitest';

import {
	collectTopLevelHtmlFragments,
	parseAttributes,
	parseHtmlTagToken,
	voidElementNames,
} from '../../src/server/html-parser';

describe('collectTopLevelHtmlFragments', () => {
	test('keeps nested elements and adjacent text grouped as top-level fragments', () => {
		const html = '<div class="outer"><span>hello</span><span>world</span></div>tail';

		expect(collectTopLevelHtmlFragments(html)).toEqual([
			'<div class="outer"><span>hello</span><span>world</span></div>',
			'tail',
		]);
	});

	test('treats comments and void elements as standalone fragments', () => {
		const html = '<!--lead--><img src="hero.png"><p>body</p>';

		expect(collectTopLevelHtmlFragments(html)).toEqual(['<!--lead-->', '<img src="hero.png">', '<p>body</p>']);
	});
});

describe('parseAttributes', () => {
	test('parses quoted, bare, and directive-style attributes', () => {
		expect(parseAttributes('foo="bar" disabled data-id=123 @click="save" .value="x"')).toEqual({
			'@click': 'save',
			'.value': 'x',
			'data-id': '123',
			disabled: '',
			foo: 'bar',
		});
	});
});

describe('parseHtmlTagToken', () => {
	test('parses open tags with attributes and nested inner HTML', () => {
		const token = parseHtmlTagToken('<section data-id="a"><section>inner</section><span>tail</span></section>', 0);

		expect(token).toEqual({
			attributes: { 'data-id': 'a' },
			end: '<section data-id="a">'.length,
			innerHtml: '<section>inner</section><span>tail</span>',
			selfClosing: false,
			tagName: 'section',
			type: 'open',
		});
	});

	test('parses comment, declaration, close, and self-closing tokens', () => {
		expect(parseHtmlTagToken('<!--note-->', 0)).toEqual({ end: '<!--note-->'.length, type: 'comment' });
		expect(parseHtmlTagToken('<!doctype html>', 0)).toEqual({ end: '<!doctype html>'.length, type: 'declaration' });
		expect(parseHtmlTagToken('</dialog>', 0)).toEqual({ end: '</dialog>'.length, type: 'close' });
		expect(parseHtmlTagToken('<input value="x">', 0)).toEqual({
			attributes: { value: 'x' },
			end: '<input value="x">'.length,
			innerHtml: '',
			selfClosing: false,
			tagName: 'input',
			type: 'open',
		});
	});
});

describe('voidElementNames', () => {
	test('contains the HTML void elements used by SSR parsing', () => {
		expect(voidElementNames.has('img')).toBe(true);
		expect(voidElementNames.has('input')).toBe(true);
		expect(voidElementNames.has('div')).toBe(false);
	});
});
