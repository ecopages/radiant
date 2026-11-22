import { userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import {
	findFieldControl,
	isPrimaryFieldControlEvent,
	readControlValidity,
	registerFieldControl,
	wireFieldControlName,
} from './control-protocol';

/**
 * Client behaviour of the field control protocol: bubbling events, native `.value`, and custom elements upgraded by
 * `document.createElement`. `control-protocol.ssr.test.ts` covers the same helpers on the SSR DOM.
 */
describe('field control protocol in the browser', () => {
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

	it('does not name the inner input of a form-associated host', () => {
		if (!customElements.get('x-face-default')) {
			customElements.define(
				'x-face-default',
				class extends HTMLElement {
					static formAssociated = true;
				},
			);
		}
		registerFieldControl('x-face-default', {
			read: (host) => host.getAttribute('value') ?? '',
			write: (host, value) => host.setAttribute('value', value == null ? '' : String(value)),
		});
		const host = document.createElement('x-face-default');
		const input = document.createElement('input');
		input.setAttribute('name', 'stale');
		host.append(input);

		wireFieldControlName(host, input, 'quantity');

		expect(host.getAttribute('name')).toBe('quantity');
		expect(input.hasAttribute('name')).toBe(false);
	});

	describe('control validity', () => {
		function defineFace(tag: string, adapter?: Parameters<typeof registerFieldControl>[1]) {
			if (!customElements.get(tag)) {
				customElements.define(
					tag,
					class extends HTMLElement {
						static formAssociated = true;
						readonly internals = this.attachInternals();
					},
				);
			}
			registerFieldControl(tag, {
				read: (host) => host.getAttribute('value') ?? '',
				write: (host, value) => host.setAttribute('value', String(value)),
				...adapter,
			});
			return document.createElement(tag) as HTMLElement & { internals: ElementInternals };
		}

		it('reports nothing for a host that is not form-associated', () => {
			if (!customElements.get('x-plain-validity')) {
				customElements.define('x-plain-validity', class extends HTMLElement {});
			}
			registerFieldControl('x-plain-validity', { read: () => '', write: () => {} });

			expect(readControlValidity(document.createElement('x-plain-validity'))).toBeUndefined();
		});

		it('reads validity properties from a form-associated host', () => {
			const host = defineFace('x-validity-default');
			Object.defineProperty(host, 'validity', { get: () => host.internals.validity });
			Object.defineProperty(host, 'validationMessage', { get: () => host.internals.validationMessage });
			document.body.append(host);
			expect(readControlValidity(host)).toEqual({ valid: true, message: '' });

			host.internals.setValidity({ customError: true }, 'Enter all 6 characters');
			expect(readControlValidity(host)).toEqual({
				valid: false,
				type: 'customError',
				message: 'Enter all 6 characters',
			});
			host.remove();
		});

		it('reads a native input, textarea or select and names the failing flag', () => {
			const input = document.createElement('input');
			input.type = 'email';
			input.required = true;
			document.body.append(input);
			expect(readControlValidity(input)).toMatchObject({ valid: false, type: 'valueMissing' });

			input.value = 'x';
			expect(readControlValidity(input)).toMatchObject({ valid: false, type: 'typeMismatch' });
			expect(readControlValidity(input)?.message).toBeTruthy();

			input.value = 'a@b.co';
			expect(readControlValidity(input)).toMatchObject({ valid: true });

			const textarea = document.createElement('textarea');
			textarea.required = true;
			textarea.minLength = 3;
			document.body.append(textarea);
			expect(readControlValidity(textarea)).toMatchObject({ valid: false, type: 'valueMissing' });

			const select = document.createElement('select');
			select.required = true;
			select.innerHTML = '<option value=""></option><option value="a">a</option>';
			document.body.append(select);
			expect(readControlValidity(select)).toMatchObject({ valid: false, type: 'valueMissing' });
			input.remove();
			textarea.remove();
			select.remove();
		});

		it('carries the constraint of the failing flag as params', () => {
			const input = document.createElement('input');
			document.body.append(input);

			input.type = 'number';
			input.min = '5';
			input.max = '10';
			input.value = '3';
			expect(readControlValidity(input)).toMatchObject({ type: 'rangeUnderflow', params: { min: 5 } });
			input.value = '30';
			expect(readControlValidity(input)).toMatchObject({ type: 'rangeOverflow', params: { max: 10 } });

			input.type = 'text';
			input.removeAttribute('min');
			input.removeAttribute('max');
			input.pattern = '[a-z]+';
			input.value = '123';
			expect(readControlValidity(input)).toMatchObject({
				type: 'patternMismatch',
				params: { pattern: '[a-z]+' },
			});

			input.type = 'email';
			input.removeAttribute('pattern');
			input.value = 'x';
			expect(readControlValidity(input)).toMatchObject({ type: 'typeMismatch', params: { inputType: 'email' } });
			input.remove();
		});

		it('carries minLength for a value the user typed too short', async () => {
			const input = document.createElement('input');
			input.minLength = 8;
			document.body.append(input);
			input.focus();
			await userEvent.keyboard('abc');

			expect(readControlValidity(input)).toMatchObject({ type: 'tooShort', params: { minLength: 8 } });
			input.remove();
		});

		it('treats a control barred from constraint validation as valid', () => {
			const input = document.createElement('input');
			input.required = true;
			input.disabled = true;
			document.body.append(input);

			expect(readControlValidity(input)).toMatchObject({ valid: true });
			input.remove();
		});

		it('does not fire invalid while reading', () => {
			const host = defineFace('x-validity-quiet');
			Object.defineProperty(host, 'validity', { get: () => host.internals.validity });
			const onInvalid = vi.fn();
			host.addEventListener('invalid', onInvalid);
			host.internals.setValidity({ customError: true }, 'Nope');

			readControlValidity(host);

			expect(onInvalid).not.toHaveBeenCalled();
		});

		it('lets the adapter override the default', () => {
			const host = defineFace('x-validity-override', {
				read: () => '',
				write: () => {},
				validity: () => ({ valid: false, message: 'From adapter' }),
			});

			expect(readControlValidity(host)).toEqual({ valid: false, message: 'From adapter' });
		});
	});
});
