import { afterEach, describe, expect, it } from 'vitest';
import { RadiantElement, customElement, prop } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { applyFieldAria } from '../field/field-aria';
import { fieldContext, type FieldContextValue } from '../field/field-context';
import { RuiField as RuiFieldElement } from '../field/field.script';
import { registerFieldControl } from './control-protocol';
void RuiFieldElement;

/**
 * A third-party control host that renders its ARIA target after it connects, the way a host whose first update
 * builds its input does.
 */
@customElement('x-aria-code')
class AriaCode extends RadiantElement {
	@prop({ type: Boolean, defaultValue: true }) ready: boolean;

	private field?: FieldContextValue;

	@onContextUpdate({ context: fieldContext })
	onField(field: FieldContextValue): void {
		this.field = field;
		applyFieldAria(this, field);
	}

	protected override updated(): void {
		if (this.ready && !this.querySelector('input')) {
			this.append(document.createElement('input'));
		}
		applyFieldAria(this, this.field);
	}
}

registerFieldControl('x-aria-code', {
	read: (host) => host.querySelector('input')?.value ?? '',
	write: (host, value) => {
		const input = host.querySelector('input');
		if (input) input.value = String(value ?? '');
	},
});

async function flush(): Promise<void> {
	await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function buildField(options: { ready: boolean; error?: string }) {
	const field = document.createElement('rui-field');
	field.setAttribute('name', 'code');
	if (options.error) field.setAttribute('error', options.error);
	field.innerHTML = `
		<label data-rui-field-label>Code</label>
		<x-aria-code data-rui-aria-target="input"></x-aria-code>
		<p data-rui-field-description>Six digits</p>
		<p data-rui-field-error></p>
	`;
	const host = field.querySelector('x-aria-code') as AriaCode;
	host.ready = options.ready;
	return { field, host };
}

describe('a custom control host painting the field ARIA state', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('labels a target that rendered while the host connected before the field first published', async () => {
		const { field, host } = buildField({ ready: true });
		document.body.append(field);
		await flush();

		const input = host.querySelector('input')!;
		const label = field.querySelector('label')!;
		expect(label.id).toBeTruthy();
		expect(input.getAttribute('aria-labelledby')).toBe(label.id);
		expect(input.getAttribute('aria-invalid')).toBe('false');
		expect(input.getAttribute('aria-describedby')).toBe(field.querySelector('[data-rui-field-description]')!.id);
	});

	it('labels a target that renders after the field connected', async () => {
		const { field, host } = buildField({ ready: false });
		document.body.append(field);
		await flush();
		expect(host.querySelector('input')).toBeNull();

		host.ready = true;
		await flush();

		const input = host.querySelector('input')!;
		expect(input.getAttribute('aria-labelledby')).toBe(field.querySelector('label')!.id);
		expect(input.getAttribute('aria-invalid')).toBe('false');
	});

	it('follows the field when it becomes invalid after the target rendered', async () => {
		const { field, host } = buildField({ ready: true });
		document.body.append(field);
		await flush();

		field.setAttribute('error', 'Required');
		await flush();

		const input = host.querySelector('input')!;
		const errorId = field.querySelector('[data-rui-field-error]')!.id;
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(errorId);
	});

	it('paints required and disabled state onto the target', async () => {
		const { field, host } = buildField({ ready: true });
		(field as RuiFieldElement).rules = { required: 'Required' };
		field.toggleAttribute('disabled', true);
		document.body.append(field);
		await flush();

		const input = host.querySelector('input')!;
		expect(input.getAttribute('aria-required')).toBe('true');
		expect(input.getAttribute('aria-disabled')).toBe('true');
	});

	it('leaves the host itself without field-written attributes', async () => {
		const { field, host } = buildField({ ready: false });
		document.body.append(field);
		await flush();

		const written = (element: Element) =>
			element.getAttributeNames().filter((name) => name === 'id' || name.startsWith('aria-') || name === 'data-rui-field-managed');
		expect(written(host)).toEqual([]);

		host.ready = true;
		await flush();
		expect(written(host)).toEqual([]);
	});
});
