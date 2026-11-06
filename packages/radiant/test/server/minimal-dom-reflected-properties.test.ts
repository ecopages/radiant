import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';

function el(tag = 'div'): MinimalHTMLElement {
	return new MinimalHTMLElement(tag, null);
}

describe('minimal DOM reflected properties', () => {
	test('className reflects to the class attribute and stays coherent with classList', () => {
		const node = el();
		node.className = 'a b';
		expect(node.getAttribute('class')).toBe('a b');
		expect(node.classList.contains('b')).toBe(true);
		node.classList.add('c');
		expect(node.className).toBe('a b c');
		node.className = 'z';
		expect(node.classList.contains('a')).toBe(false);
		expect(node.outerHTML).toBe('<div class="z"></div>');
	});

	test('className reads a parsed class attribute', () => {
		const host = el();
		host.innerHTML = '<p class="x y"></p>';
		expect((host.childNodes[0] as MinimalHTMLElement).className).toBe('x y');
	});

	test.each(['title', 'lang', 'dir'] as const)('%s reflects as a string attribute', (name) => {
		const node = el();
		expect(node[name]).toBe('');
		node[name] = 'v';
		expect(node.getAttribute(name)).toBe('v');
		expect(node[name]).toBe('v');
		expect(node.outerHTML).toBe(`<div ${name}="v"></div>`);
	});

	test('hidden reflects as attribute presence', () => {
		const node = el();
		expect(node.hidden).toBe(false);
		node.hidden = true;
		expect(node.outerHTML).toBe('<div hidden></div>');
		expect(node.hidden).toBe(true);
		node.hidden = false;
		expect(node.hasAttribute('hidden')).toBe(false);
		expect(node.outerHTML).toBe('<div></div>');
	});

	test('tabIndex reflects as a numeric tabindex attribute', () => {
		const node = el();
		expect(node.tabIndex).toBe(-1);
		node.tabIndex = 0;
		expect(node.getAttribute('tabindex')).toBe('0');
		node.tabIndex = 2.7;
		expect(node.tabIndex).toBe(2);
	});

	test('type reflects on tags that define it and defaults like the DOM', () => {
		const button = el('button');
		expect(button.type).toBe('submit');
		button.type = 'button';
		expect(button.outerHTML).toBe('<button type="button"></button>');
		expect(el('input').type).toBe('text');
	});

	test('type stays a plain value on tags that do not define it', () => {
		const node = el('div');
		node.type = 'x';
		expect(node.type).toBe('x');
		expect(node.hasAttribute('type')).toBe(false);
	});

	test('disabled reflects as presence on form controls', () => {
		const button = el('button');
		expect(button.disabled).toBe(false);
		button.disabled = true;
		expect(button.outerHTML).toBe('<button disabled></button>');
		button.disabled = false;
		expect(button.outerHTML).toBe('<button></button>');
	});

	test('disabled stays a plain value on tags that do not define it', () => {
		const node = el('div');
		node.disabled = true;
		expect(node.disabled).toBe(true);
		expect(node.hasAttribute('disabled')).toBe(false);
	});

	test('the carousel indicator recipe serializes type and class', () => {
		const container = el();
		const button = new MinimalHTMLElement('button', null);
		button.type = 'button';
		button.className = 'rui-carousel__indicator';
		button.id = 'tab-0';
		container.replaceChildren(button as never);
		expect(container.innerHTML).toBe('<button type="button" class="rui-carousel__indicator" id="tab-0"></button>');
	});
});
