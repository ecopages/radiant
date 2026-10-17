import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';
import { decodeHtmlEntities } from '../../src/utils/decode-html-entities';

describe('minimal DOM entity round-trip', () => {
	test('text entities survive innerHTML set then get', () => {
		const el = new MinimalHTMLElement('div', null);
		el.innerHTML = 'Terms &amp; Conditions';
		expect(el.innerHTML).toBe('Terms &amp; Conditions');
	});

	test('attribute values are decoded so re-serialization escapes once', () => {
		const el = new MinimalHTMLElement('div', null);
		el.innerHTML = '<se-field data-rules="[{&quot;type&quot;:1}]"></se-field>';
		const field = el.childNodes[0] as MinimalHTMLElement;
		expect(field.getAttribute('data-rules')).toBe('[{"type":1}]');
		field.setAttribute('id', 'a');
		expect(field.outerHTML).toBe('<se-field data-rules="[{&quot;type&quot;:1}]" id="a"></se-field>');
	});

	test('textContent of a parsed element is decoded', () => {
		const el = new MinimalHTMLElement('div', null);
		el.innerHTML = '<p>a &lt; b &amp;amp; c</p>';
		expect(el.textContent).toBe('a < b &amp; c');
	});

	test('re-serializing materialized children escapes once', () => {
		const el = new MinimalHTMLElement('div', null);
		el.innerHTML = '<p data-a="&quot;q&quot;">a &lt; b &amp; c &nbsp;</p>';
		el.querySelectorAll('span');
		expect(el.innerHTML).toBe('<p data-a="&quot;q&quot;">a &lt; b &amp; c \u00a0</p>');
	});

	test('script content is not corrupted when children are materialized', () => {
		const el = new MinimalHTMLElement('div', null);
		const html = '<script type="application/json">{"t":"&quot;x&quot;"}</script>';
		el.innerHTML = html;
		el.querySelectorAll('span');
		expect(el.innerHTML).toBe(html);
	});

	test('style and script text stay raw', () => {
		const el = new MinimalHTMLElement('div', null);
		el.innerHTML = '<style>.a::before{content:"&amp;"}</style>';
		expect(el.textContent).toBe('.a::before{content:"&amp;"}');
	});

	test('decodes common named entities and replaces invalid numeric references', () => {
		expect(decodeHtmlEntities('a&nbsp;b &copy; &#x41; &#0; &#xD800; &#1114112; &unknown;')).toBe(
			'a\u00a0b \u00a9 A \ufffd \ufffd \ufffd &unknown;',
		);
		expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;');
	});
});
