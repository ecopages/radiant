import { describe, expect, it } from 'vitest';
import { getListboxOptionLabel, getListboxOptionValue } from './listbox-option';

function option(html: string, attributes: Record<string, string> = {}): HTMLElement {
	const node = document.createElement('div');
	node.setAttribute('role', 'option');
	for (const [name, value] of Object.entries(attributes)) {
		node.setAttribute(name, value);
	}
	node.innerHTML = html;
	return node;
}

describe('getListboxOptionLabel', () => {
	it('prefers data-label over visible text', () => {
		const node = option('Visible <span data-listbox-option-indicator>check</span>', { 'data-label': 'Apple' });
		expect(getListboxOptionLabel(node)).toBe('Apple');
	});

	it('skips indicator subtrees without cloning the option', () => {
		const node = option('Cherry<span data-listbox-option-indicator>Selected</span>');
		expect(getListboxOptionLabel(node)).toBe('Cherry');
		expect(node.querySelector('[data-listbox-option-indicator]')?.textContent).toBe('Selected');
	});

	it('reads decorated content when data-label is omitted', () => {
		const node = option('<span aria-hidden="true">🍎</span> Apple<span data-listbox-option-indicator>check</span>');
		expect(getListboxOptionLabel(node)).toBe('🍎 Apple');
	});
});

describe('getListboxOptionValue', () => {
	it('prefers data-value over the visible label', () => {
		const node = option('Apple<span data-listbox-option-indicator>check</span>', { 'data-value': 'apple' });
		expect(getListboxOptionValue(node)).toBe('apple');
	});

	it('falls back to the label without indicator text', () => {
		const node = option('Banana<span data-listbox-option-indicator>check</span>');
		expect(getListboxOptionValue(node)).toBe('Banana');
	});
});
