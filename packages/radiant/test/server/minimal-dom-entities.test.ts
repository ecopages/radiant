import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement, MinimalTextNode } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';
import { decodeHtmlEntities } from '../../src/utils/decode-html-entities';

function parse(html: string): MinimalHTMLElement {
	const el = new MinimalHTMLElement('div', null);
	el.innerHTML = html;
	return el;
}

function firstChild(el: MinimalHTMLElement): MinimalHTMLElement {
	return el.childNodes[0] as unknown as MinimalHTMLElement;
}

describe('minimal DOM entity round-trip', () => {
	test('text entities survive innerHTML set then get', () => {
		expect(parse('Terms &amp; Conditions').innerHTML).toBe('Terms &amp; Conditions');
	});

	test('attribute values are decoded so re-serialization escapes once', () => {
		const field = firstChild(parse('<se-field data-rules="[{&quot;type&quot;:1}]"></se-field>'));
		expect(field.getAttribute('data-rules')).toBe('[{"type":1}]');
		field.setAttribute('id', 'a');
		expect(field.outerHTML).toBe('<se-field data-rules="[{&quot;type&quot;:1}]" id="a"></se-field>');
	});

	test('textContent of a parsed element is decoded', () => {
		expect(parse('<p>a &lt; b &amp;amp; c</p>').textContent).toBe('a < b &amp; c');
	});

	test('a queried subtree serializes exactly as written, entities the decoder does not know included', () => {
		const html = '<p data-a="&quot;q&quot;" title="&euro;">a &lt; b &amp; c &nbsp;&rsquo;<b>x</b></p>';
		const el = parse(html);
		el.querySelectorAll('b');
		expect(el.innerHTML).toBe(html);
	});

	test('a mutation re-serializes only what changed; untouched text keeps its source', () => {
		const el = parse('<p>&euro; <b>old</b></p>');
		const bold = el.querySelector('b') as MinimalHTMLElement;
		(bold.childNodes[0] as unknown as MinimalTextNode).textContent = 'a & b';
		expect(el.innerHTML).toBe('<p>&euro; <b>a &amp; b</b></p>');
	});

	test('setAttribute on a parsed element keeps its unmaterialized children', () => {
		const div = firstChild(parse('<div class="a"><p>x</p></div>'));
		div.setAttribute('id', 'z');
		expect(div.outerHTML).toBe('<div class="a" id="z"><p>x</p></div>');
	});

	test('appending to a parsed element keeps its parsed children and the appended node', () => {
		const list = firstChild(parse('<ul><li>a</li></ul>'));
		list.insertAdjacentHTML('beforeend', '<li>b</li>');
		expect(list.childNodes).toHaveLength(2);
		expect(list.outerHTML).toBe('<ul><li>a</li><li>b</li></ul>');
	});

	test('a descendant attribute change reaches ancestor serialization', () => {
		const el = parse('<form><label><input name="q"></label></form>');
		(el.querySelector('input') as MinimalHTMLElement).setAttribute('value', '"x"');
		expect(el.innerHTML).toBe('<form><label><input name="q" value="&quot;x&quot;"></label></form>');
	});

	test('script content is not corrupted when children are materialized', () => {
		const html = '<script type="application/json">{"t":"&quot;x&quot;"}</script>';
		const el = parse(html);
		el.querySelectorAll('span');
		expect(el.innerHTML).toBe(html);
	});

	test('style and script text stay raw', () => {
		expect(parse('<style>.a::before{content:"&amp;"}</style>').textContent).toBe('.a::before{content:"&amp;"}');
	});

	test('script text set from code is emitted raw and cannot close its element', () => {
		const script = firstChild(parse('<script type="application/json"></script>'));
		script.textContent = '{"a":"<b> & </script><img>"}';
		expect(script.outerHTML).toBe('<script type="application/json">{"a":"<b> & <\\/script><img>"}</script>');
	});

	test('comments keep their source and add no text', () => {
		const el = parse('<p><!-- note -->a</p>');
		el.querySelectorAll('span');
		expect(el.textContent).toBe('a');
		expect(el.innerHTML).toBe('<p><!-- note -->a</p>');
	});

	test('decodes common named entities and replaces invalid numeric references', () => {
		expect(decodeHtmlEntities('a&nbsp;b &copy; &#x41; &#0; &#xD800; &#1114112; &unknown;')).toBe(
			'a b © A � � � &unknown;',
		);
		expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;');
	});
});
