import { describe, expect, it, vi } from 'vitest';
import {
	findFieldControl,
	isPrimaryFieldControlEvent,
	readControlValidity,
	registerFieldControl,
	wireFieldControlName,
} from '../form/control-protocol';

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
			expect(readControlValidity(host)).toEqual({ valid: false, message: 'Enter all 6 characters' });
			host.remove();
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
