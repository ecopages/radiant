import { afterEach, describe, expect, it } from 'vitest';
import { RuiNumberField as RuiNumberFieldElement } from './number-field.script';

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await tick();
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiNumberField commit', () => {
	it('commits the typed draft on blur (focusout delegation)', async () => {
		document.body.innerHTML = `
			<rui-number-field name="quantity">
				<input data-number-field-input />
			</rui-number-field>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]');

		input?.focus();
		if (input) input.value = '3';
		input?.dispatchEvent(new Event('input', { bubbles: true }));
		input?.blur();
		await settled();

		expect(host.value).toBe(3);
	});

	it('submits the raw number through a named host', async () => {
		document.body.innerHTML = `
			<form>
				<rui-number-field name="quantity" value="3">
					<input data-number-field-input />
				</rui-number-field>
			</form>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const form = document.querySelector('form') as HTMLFormElement;
		expect(new FormData(form).get('quantity')).toBe('3');
	});

	it('keeps the formatted display value in sync after commit', async () => {
		document.body.innerHTML = `
			<rui-number-field name="quantity">
				<input data-number-field-input />
			</rui-number-field>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]');

		input?.focus();
		if (input) input.value = '7';
		input?.dispatchEvent(new Event('input', { bubbles: true }));
		input?.blur();
		await settled();

		expect(input?.value).toBe('7');
	});
});
