import { describe, expect, it } from 'vitest';
import { findFieldControl, isNativeTextControl } from '../form/control-protocol';

describe('field control protocol (SSR-safe)', () => {
	it('discovers marked inputs and host tags, not bare natives', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<input type="text" value="bare" />
			<input data-rui-control type="email" value="marked" />
		`;

		const control = findFieldControl(field);
		expect(control).not.toBeNull();
		expect(control?.hasAttribute('data-rui-control')).toBe(true);
		expect((control as HTMLInputElement).value).toBe('marked');
	});

	it('discovers rui-select hosts when no marked descendant exists', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<input type="text" />
			<rui-select value="pro"></rui-select>
		`;

		expect(findFieldControl(field)?.localName).toBe('rui-select');
	});

	it('detects presentational text controls by tag name', () => {
		const input = document.createElement('input');
		const div = document.createElement('div');
		expect(isNativeTextControl(input)).toBe(true);
		expect(isNativeTextControl(div)).toBe(false);
	});
});
