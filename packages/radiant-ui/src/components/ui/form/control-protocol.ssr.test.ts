import { describe, expect, it } from 'vitest';
import {
	findFieldControl,
	getAriaControlTarget,
	isNativeTextControl,
	isPrimaryFieldControlEvent,
} from '../form/control-protocol';

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

	/**
	 * In a real DOM the `checked` property tracks user selection while the attribute keeps
	 * marking whatever was server-rendered, so the property has to win. This is why the
	 * radio-group branch cannot simply swap `:checked` for `[checked]`.
	 */
	it('targets the user-selected radio, not the server-rendered one', () => {
		const host = document.createElement('rui-radio-group');
		host.innerHTML = `
			<input type="radio" value="free" />
			<input type="radio" value="pro" checked />
		`;
		const [free, pro] = Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]'));

		expect(getAriaControlTarget(host).getAttribute('value')).toBe('pro');

		pro!.checked = false;
		free!.checked = true;

		expect(getAriaControlTarget(host).getAttribute('value')).toBe('free');
		expect(pro!.hasAttribute('checked')).toBe(true);
	});

	it('discovers the checkbox-group host, not inner checkbox hosts', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<div class="rui-field" data-ref="field">
				<rui-checkbox-group value="news">
					<div data-checkbox-group-root data-rui-control role="group">
						<rui-checkbox value="news" checked></rui-checkbox>
						<rui-checkbox value="travel"></rui-checkbox>
					</div>
				</rui-checkbox-group>
			</div>
		`;

		const control = findFieldControl(field);
		expect(control?.localName).toBe('rui-checkbox-group');
		expect(getAriaControlTarget(control!).getAttribute('data-checkbox-group-root')).not.toBeNull();
	});

	it('prefers a select host over an embedded listbox', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<rui-select>
				<button data-rui-control type="button"></button>
				<rui-listbox embedded>
					<div role="listbox"></div>
				</rui-listbox>
			</rui-select>
		`;

		expect(findFieldControl(field)?.localName).toBe('rui-select');
	});

	it('discovers a standalone listbox as the field control', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<rui-listbox>
				<div role="listbox" data-rui-control></div>
			</rui-listbox>
		`;

		expect(findFieldControl(field)?.localName).toBe('rui-listbox');
	});

	it('does not discover an embedded listbox as a field control', () => {
		const field = document.createElement('div');
		field.innerHTML = `<rui-listbox embedded></rui-listbox>`;

		expect(findFieldControl(field)).toBeNull();
	});

	it('treats a standalone listbox change as the field control event', () => {
		const field = document.createElement('div');
		field.innerHTML = `<rui-listbox></rui-listbox>`;
		const listbox = field.querySelector('rui-listbox')!;
		let seen: Event | undefined;
		field.addEventListener('rui-change', (event) => {
			seen = event;
		});
		listbox.dispatchEvent(new Event('rui-change', { bubbles: true }));

		expect(seen).toBeDefined();
		expect(isPrimaryFieldControlEvent(field, seen!)).toBe(true);
	});

	it('ignores rui-change from an embedded listbox inside select', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<rui-select>
				<rui-listbox embedded></rui-listbox>
			</rui-select>
		`;
		const listbox = field.querySelector('rui-listbox')!;
		let seen: Event | undefined;
		field.addEventListener('rui-change', (event) => {
			seen = event;
		});
		listbox.dispatchEvent(new Event('rui-change', { bubbles: true }));

		expect(seen).toBeDefined();
		expect(isPrimaryFieldControlEvent(field, seen!)).toBe(false);
	});
});
