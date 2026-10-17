import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement, MinimalNode } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';

function parse(html: string): MinimalHTMLElement {
	const el = new MinimalHTMLElement('div', null);
	el.innerHTML = html;
	return el;
}

function child(el: MinimalHTMLElement, index = 0): MinimalHTMLElement {
	return el.childNodes[index] as unknown as MinimalHTMLElement;
}

describe('minimal DOM parsing follows the HTML spec', () => {
	test('comments are comment nodes and add no text', () => {
		const el = parse('a<!-- note -->b<!-->c<!--->');
		expect(Array.from(el.childNodes, (node) => node.nodeType)).toEqual([3, MinimalNode.COMMENT_NODE, 3, 8, 3, 8]);
		expect(el.textContent).toBe('abc');
		expect(el.childNodes[3]?.textContent).toBe('');
	});

	test('bogus markup becomes comments, and doctype and </> are dropped', () => {
		const el = parse('a<?pi x?><!doctype html></ odd></>b');
		expect(Array.from(el.childNodes, (node) => [node.nodeType, node.textContent])).toEqual([
			[3, 'a'],
			[8, '?pi x?'],
			[8, ' odd'],
			[3, 'b'],
		]);
	});

	test('a < that cannot start markup is text', () => {
		const el = parse('a < b <3 c');
		expect(el.childNodes).toHaveLength(1);
		expect(el.textContent).toBe('a < b <3 c');
	});

	test('textarea and title content is text with references decoded', () => {
		const el = parse('<textarea><b>x</b> &amp;</textarea><title>a <i>b</i></title>');
		expect(child(el).textContent).toBe('<b>x</b> &');
		expect(child(el).children).toHaveLength(0);
		expect(child(el, 1).textContent).toBe('a <i>b</i>');
	});

	test('a newline after a pre start tag is dropped, but kept by fragment parsing', () => {
		const pre = child(parse('<pre>\nx</pre>'));
		expect(pre.textContent).toBe('x');
		expect(pre.outerHTML).toBe('<pre>\nx</pre>');

		pre.innerHTML = '\ny';
		expect(pre.textContent).toBe('\ny');
		expect(pre.innerHTML).toBe('\ny');
		expect(pre.outerHTML).toBe('<pre>\n\ny</pre>');
	});

	test('CR and CRLF become LF', () => {
		const el = parse('<p title="a\r\nb">c\rd</p>');
		expect(child(el).getAttribute('title')).toBe('a\nb');
		expect(el.textContent).toBe('c\nd');
	});

	test('the first of duplicate attributes wins', () => {
		expect(child(parse('<p title="first" title="second"></p>')).getAttribute('title')).toBe('first');
	});

	test('insertAdjacentHTML inserts at each position', () => {
		const el = parse('<ul><li>b</li></ul>');
		const list = child(el);
		const item = child(list);
		item.insertAdjacentHTML('beforebegin', '<li>a</li>');
		item.insertAdjacentHTML('afterend', '<li>c</li>');
		item.insertAdjacentHTML('afterbegin', '[');
		item.insertAdjacentHTML('beforeend', ']');
		expect(el.innerHTML).toBe('<ul><li>a</li><li>[b]</li><li>c</li></ul>');
	});

	test('serializing a mutated deep tree takes linear time', () => {
		const depth = 200;
		const el = parse(`${'<div>'.repeat(depth)}x${'</div>'.repeat(depth)}`);
		let leaf: MinimalHTMLElement = el;
		while (leaf.children.length > 0) leaf = leaf.children[0] as unknown as MinimalHTMLElement;
		leaf.setAttribute('data-leaf', '');

		const start = performance.now();
		expect(el.innerHTML).toContain('<div data-leaf>x</div>');
		expect(performance.now() - start).toBeLessThan(500);
	});

	test('a self-closing custom element nested in parsed markup serializes as an open tag with its siblings after it', () => {
		const el = parse('<section><x-card/><p>after</p></section>');
		const section = child(el);

		expect(section.children).toHaveLength(2);
		expect(section.outerHTML).toBe('<section><x-card></x-card><p>after</p></section>');
	});

	test('kept text source never merges with appended text into markup or entities', () => {
		const lessThan = child(parse('<p>Price <</p>'));
		lessThan.append('img src=x onerror=alert(1) x=');
		expect(lessThan.outerHTML).not.toContain('<img');

		const ampersand = child(parse('<p>Terms &</p>'));
		ampersand.append('not a word');
		expect(ampersand.outerHTML).toBe('<p>Terms &amp;not a word</p>');
	});

	test('parsed text keeps its spelling only while it still means the same thing', () => {
		expect(child(parse('<p>a &amp; b &nbsp;</p>')).outerHTML).toBe('<p>a &amp; b &nbsp;</p>');

		const el = parse('<script>var a = "&amp;";</script><div></div>');
		const script = child(el, 0);
		const div = child(el, 1);
		div.append(script.childNodes[0] as unknown as Node);
		expect(div.outerHTML).toBe('<div>var a = "&amp;amp;";</div>');
	});

	test('a newline written as a character reference after a pre start tag is dropped from the source too', () => {
		const pre = child(parse('<pre>&#10;x</pre>'));
		expect(pre.textContent).toBe('x');
		expect(pre.innerHTML).toBe('x');
	});

	test('markup set through innerHTML on a title or textarea is not written back as markup', () => {
		const title = child(parse('<title></title>'));
		title.textContent = '</title><img src=x onerror=alert(1)>';
		expect(title.outerHTML).not.toContain('<img');
	});
});
