import { describe, expect, it } from 'vitest';
import { findFieldControl, getAriaControlTarget, isNativeTextControl } from '../form/control-protocol';

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

	it('discovers checkbox-group surface instead of inner checkbox hosts', () => {
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
		expect(control?.getAttribute('data-checkbox-group-root')).not.toBeNull();
		expect(getAriaControlTarget(control!).getAttribute('data-checkbox-group-root')).not.toBeNull();
	});
});
