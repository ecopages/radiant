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
		expect((host.childNodes[0] as unknown as MinimalHTMLElement).className).toBe('x y');
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

	test('the tabIndex attribute spelling shares the tabindex attribute with the property', () => {
		const node = el('button');
		node.setAttribute('tabIndex', '0');
		node.tabIndex = -1;
		expect(node.outerHTML).toBe('<button tabindex="-1"></button>');
		expect(node.getAttribute('tabIndex')).toBe('-1');
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

	test('select, textarea, fieldset and output expose a read-only type', () => {
		const select = el('select');
		expect(select.type).toBe('select-one');
		select.setAttribute('multiple', '');
		expect(select.type).toBe('select-multiple');
		select.type = 'x';
		expect(select.hasAttribute('type')).toBe(false);
		for (const tag of ['textarea', 'fieldset', 'output']) {
			expect(el(tag).type).toBe(tag);
		}
	});

	test('type lowercases and falls back on an invalid value', () => {
		const input = el('input');
		input.type = 'CheckBox';
		expect(input.type).toBe('checkbox');
		input.type = 'bogus';
		expect(input.type).toBe('text');
		const button = el('button');
		button.type = 'RESET';
		expect(button.type).toBe('reset');
		button.type = 'bogus';
		expect(button.type).toBe('submit');
	});

	test('tabIndex defaults by tag and converts like WebIDL', () => {
		for (const tag of ['button', 'input', 'select', 'textarea', 'summary', 'iframe']) {
			expect(el(tag).tabIndex).toBe(0);
		}
		expect(el('div').tabIndex).toBe(-1);
		const anchor = el('a');
		expect(anchor.tabIndex).toBe(-1);
		anchor.setAttribute('href', '/');
		expect(anchor.tabIndex).toBe(0);
		const node = el();
		node.tabIndex = Number.NaN;
		expect(node.getAttribute('tabindex')).toBe('0');
		node.tabIndex = 'abc' as unknown as number;
		expect(node.getAttribute('tabindex')).toBe('0');
	});

	test('disabled reflects on link', () => {
		const link = el('link');
		link.disabled = true;
		expect(link.outerHTML).toBe('<link disabled>');
	});

	test('hidden keeps until-found', () => {
		const node = el();
		node.hidden = 'until-found';
		expect(node.getAttribute('hidden')).toBe('until-found');
		expect(node.hidden).toBe('until-found');
		node.hidden = true;
		expect(node.hidden).toBe(true);
		expect(node.getAttribute('hidden')).toBe('');
	});
});
