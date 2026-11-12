import { afterEach, describe, expect, it } from 'vitest';
import { RadiantElement, bindTo, customElement, prop, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAria, fieldAriaBindings } from '../field/field-aria';
import { fieldContext, type FieldContextValue } from '../field/field-context';
import { RuiField as RuiFieldElement } from '../field/field.script';
import { registerFieldControl } from './control-protocol';
void RuiFieldElement;

/**
 * A third-party control host that keeps authored DOM: its target is in the light DOM, and the field context is
 * copied onto it with `@bindTo`.
 */
@customElement('x-aria-code')
class AriaCode extends RadiantElement {
	@prop({ type: Boolean, defaultValue: true }) ready: boolean;

	@contextSelector({ context: fieldContext })
	@bindTo(fieldAriaBindings('input'))
	@state
	field?: FieldContextValue = undefined;
}

/** A third-party control host that owns a `render()` tree and spreads the field's ARIA on its target. */
@customElement('x-aria-render')
class AriaRender extends RadiantElement {
	@prop({ type: Boolean, defaultValue: true }) ready: boolean;

	@contextSelector({ context: fieldContext })
	@state
	field?: FieldContextValue = undefined;

	override render() {
		return <div>{this.ready ? <input {...fieldAria(this.field)} /> : null}</div>;
	}
}

void AriaRender;

for (const tag of ['x-aria-code', 'x-aria-render']) {
	registerFieldControl(tag, {
		read: (host) => host.querySelector('input')?.value ?? '',
		write: (host, value) => {
			const input = host.querySelector('input');
			if (input) input.value = String(value ?? '');
		},
	});
}

async function flush(): Promise<void> {
	await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function buildField(options: { ready: boolean; error?: string; tag: string }) {
	const field = document.createElement('rui-field');
	field.setAttribute('name', 'code');
	if (options.error) field.setAttribute('error', options.error);
	field.innerHTML = `
		<label data-rui-field-label>Code</label>
		<${options.tag} data-rui-aria-target="input">${options.tag === 'x-aria-code' ? '<input />' : ''}</${options.tag}>
		<p data-rui-field-description>Six digits</p>
		<p data-rui-field-error></p>
	`;
	const host = field.querySelector(options.tag) as AriaCode;
	host.ready = options.ready;
	return { field, host };
}

describe.each(['x-aria-code', 'x-aria-render'])('a custom control host (%s) painting the field ARIA state', (tag) => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('labels a target that rendered while the host connected before the field first published', async () => {
		const { field, host } = buildField({ tag, ready: true });
		document.body.append(field);
		await flush();

		const input = host.querySelector('input')!;
		const label = field.querySelector('label')!;
		expect(label.id).toBeTruthy();
		expect(input.getAttribute('aria-labelledby')).toBe(label.id);
		expect(input.getAttribute('aria-invalid')).toBe('false');
		expect(input.getAttribute('aria-describedby')).toBe(field.querySelector('[data-rui-field-description]')!.id);
	});

	it.runIf(tag === 'x-aria-render')('labels a target that renders after the field connected', async () => {
		const { field, host } = buildField({ tag, ready: false });
		document.body.append(field);
		await flush();
		expect(host.querySelector('input')).toBeNull();

		host.ready = true;
		await flush();

		const input = host.querySelector('input')!;
		expect(input.getAttribute('aria-labelledby')).toBe(field.querySelector('label')!.id);
		expect(input.getAttribute('aria-invalid')).toBe('false');
	});

	it('points the label at the target and focuses it on click', async () => {
		const { field, host } = buildField({ tag, ready: true });
		document.body.append(field);
		await flush();

		const input = host.querySelector('input')!;
		const label = field.querySelector('label')!;
		expect(input.id).toBeTruthy();
		expect(label.htmlFor).toBe(input.id);
		label.click();
		expect(document.activeElement).toBe(input);
	});

	it('follows the field when it becomes invalid after the target rendered', async () => {
		const { field, host } = buildField({ tag, ready: true });
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
		const { field, host } = buildField({ tag, ready: true });
		(field as RuiFieldElement).rules = { required: 'Required' };
		field.toggleAttribute('disabled', true);
		document.body.append(field);
		await flush();

		const input = host.querySelector('input')!;
		expect(input.getAttribute('aria-required')).toBe('true');
		expect(input.getAttribute('aria-disabled')).toBe('true');
	});

	it('leaves the host itself without field-written attributes', async () => {
		const { field, host } = buildField({ tag, ready: false });
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
