import { describe, expect, it } from 'vitest';
import {
	findFieldControl,
	getAriaControlTarget,
	getAriaControlTargets,
	isNativeTextControl,
	isPrimaryFieldControlEvent,
	readControlValue,
	registerFieldControl,
	wireFieldControlName,
	writeControlValue,
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

	it('discovers standalone rui-date-input stamped with data-rui-control', () => {
		const field = document.createElement('div');
		field.innerHTML = `
			<rui-date-input data-rui-control data-rui-control-type="date" data-rui-aria-target='[data-ref="root"]'>
				<div data-ref="root" id="segments"></div>
			</rui-date-input>
		`;

		const control = findFieldControl(field);
		expect(control?.localName).toBe('rui-date-input');
		expect(getAriaControlTarget(control!).id).toBe('segments');
	});

	it('honors data-rui-aria-target on the control host', () => {
		const host = document.createElement('rui-date-field');
		host.setAttribute('data-rui-aria-target', '[data-segment-root]');
		host.innerHTML = '<div data-segment-root id="segments"></div>';

		expect(getAriaControlTarget(host).id).toBe('segments');
	});

	it('honors data-rui-aria-targets for multi-surface hosts', () => {
		const host = document.createElement('rui-date-range-picker');
		host.setAttribute('data-rui-aria-targets', '[data-start],[data-end]');
		host.innerHTML = '<div data-start id="start"></div><div data-end id="end"></div>';

		const targets = getAriaControlTargets(host);
		expect(targets.map((node) => node.id)).toEqual(['start', 'end']);
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

	it('discovers a host registered with registerFieldControl', () => {
		registerFieldControl('my-swatch', {
			read: (host) => host.getAttribute('hex') ?? '',
			write: (host, value) => {
				host.setAttribute('hex', value == null ? '' : String(value));
			},
		});
		const field = document.createElement('div');
		field.innerHTML = `<my-swatch hex="ff00aa"></my-swatch>`;
		const control = findFieldControl(field);
		expect(control?.localName).toBe('my-swatch');
		expect(readControlValue(control!)).toBe('ff00aa');
		writeControlValue(control!, '00ffaa');
		expect(control?.getAttribute('hex')).toBe('00ffaa');
	});

	it('names a form-associated host and clears its inner input', () => {
		if (!customElements.get('x-face-control')) {
			customElements.define(
				'x-face-control',
				class extends HTMLElement {
					static formAssociated = true;
				},
			);
		}
		registerFieldControl('x-face-control', {
			read: (host) => host.getAttribute('value') ?? '',
			write: (host, value) => {
				host.setAttribute('value', value == null ? '' : String(value));
			},
		});
		const host = document.createElement('x-face-control');
		const input = document.createElement('input');
		input.setAttribute('name', 'stale');
		host.append(input);

		wireFieldControlName(host, input, 'quantity');

		expect(host.getAttribute('name')).toBe('quantity');
		expect(input.hasAttribute('name')).toBe(false);
	});

	it('does not name a store-only host inner textbox', () => {
		const host = document.createElement('rui-combobox');
		const input = document.createElement('input');

		wireFieldControlName(host, input, 'country');

		expect(input.hasAttribute('name')).toBe(false);
		expect(host.getAttribute('name')).toBe('country');
	});

	it('names the inner input for a checkbox host', () => {
		const host = document.createElement('rui-checkbox');
		const input = document.createElement('input');
		input.type = 'checkbox';

		wireFieldControlName(host, input, 'tos');

		expect(input.name).toBe('tos');
		expect(host.getAttribute('name')).toBe('tos');
	});
});
