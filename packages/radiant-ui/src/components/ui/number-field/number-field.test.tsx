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

	async function mount(
		attrs = '',
	): Promise<{ host: RuiNumberFieldElement; input: HTMLInputElement; changes: number[] }> {
		document.body.innerHTML = `
			<rui-number-field ${attrs}>
				<input data-number-field-input />
			</rui-number-field>
		`;
		await customElements.whenDefined('rui-number-field');
		await settled();
		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		const changes: number[] = [];
		host.addEventListener('rui-change', (event) =>
			changes.push((event as CustomEvent<{ value: number }>).detail.value),
		);
		return { host, input, changes };
	}

	async function typeAndBlur(input: HTMLInputElement, text: string): Promise<void> {
		input.focus();
		input.value = text;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.blur();
		await settled();
	}

	it('commits a typed 0 on an empty field and emits change', async () => {
		const { host, input, changes } = await mount();

		await typeAndBlur(input, '0');

		expect(host.value).toBe(0);
		expect(changes).toEqual([0]);
	});

	it('does not emit when the same committed value is typed again', async () => {
		const { host, input, changes } = await mount();

		await typeAndBlur(input, '5');
		await typeAndBlur(input, '5');

		expect(host.value).toBe(5);
		expect(changes).toEqual([5]);
	});

	it('does not commit when an empty field is focused and blurred untouched', async () => {
		const { host, input, changes } = await mount();

		input.focus();
		input.blur();
		await settled();

		expect(host.value).toBeUndefined();
		expect(changes).toEqual([]);
	});

	it('displays an empty field with no aria-valuenow, then 0 once 0 is typed', async () => {
		const { input } = await mount();

		expect(input.value).toBe('');
		expect(input.hasAttribute('aria-valuenow')).toBe(false);

		await typeAndBlur(input, '0');

		expect(input.value).toBe('0');
		expect(input.getAttribute('aria-valuenow')).toBe('0');
	});

	it('submits an empty string for an empty named field', async () => {
		document.body.innerHTML = `
			<form>
				<rui-number-field name="quantity">
					<input data-number-field-input />
				</rui-number-field>
			</form>
		`;
		await customElements.whenDefined('rui-number-field');
		await settled();

		const form = document.querySelector('form') as HTMLFormElement;
		expect(new FormData(form).get('quantity')).toBe('');
	});
});
