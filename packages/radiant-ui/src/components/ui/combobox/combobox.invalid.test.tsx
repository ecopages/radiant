import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import '../../../styles/radiant-ui.css';
import '../../../styles/themes/default.css';
import './combobox.css';
import { RuiField } from '../field';
import { RuiField as RuiFieldElement } from '../field/field.script';
import { RuiCombobox } from './combobox';
import { RuiCombobox as RuiComboboxElement } from './combobox.script';
void RuiFieldElement;
void RuiComboboxElement;

const OPTIONS = [
	{ value: 'a', label: 'Alpha' },
	{ value: 'b', label: 'Beta' },
];

async function flush(): Promise<void> {
	await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function borderColor(element: Element): string {
	(element as HTMLElement).style.transition = 'none';
	return getComputedStyle(element).borderTopColor;
}

async function mount() {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<RuiField name="choice">
			<RuiCombobox options={OPTIONS} placeholder="Choice" />
		</RuiField>,
	);
	await customElements.whenDefined('rui-field');
	await customElements.whenDefined('rui-combobox');
	await flush();
	const reference = document.createElement('i');
	reference.style.border = '1px solid var(--color-error)';
	document.body.append(reference);
	return {
		field: host.querySelector('rui-field')!,
		control: host.querySelector('.rui-combobox__control')!,
		target: host.querySelector('[data-rui-control]')!,
		error: borderColor(reference),
	};
}

afterEach(() => document.body.replaceChildren());

describe('RuiCombobox in an invalid field', () => {
	it('keeps the normal border while the field is valid', async () => {
		const { control, target, error } = await mount();
		expect(target.getAttribute('aria-invalid')).not.toBe('true');
		expect(borderColor(control)).not.toBe(error);
	});

	it('paints the control border with the error colour once the field reports an error', async () => {
		const { field, control, target, error } = await mount();
		field.setAttribute('error', 'Pick one');
		await flush();
		expect(target.getAttribute('aria-invalid')).toBe('true');
		expect(borderColor(control)).toBe(error);
	});

	it('returns to the normal border when the error clears', async () => {
		const { field, control, error } = await mount();
		const normal = borderColor(control);
		field.setAttribute('error', 'Pick one');
		await flush();
		field.removeAttribute('error');
		await flush();
		expect(borderColor(control)).toBe(normal);
		expect(normal).not.toBe(error);
	});
});
