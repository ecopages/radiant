import { afterEach, describe, expect, test } from 'vitest';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { FormAssociatedElement, type FormValue } from '../../src/form-associated-element';

@customElement('fae-tone')
class ToneControl extends FormAssociatedElement {
	@prop({ type: String, reflect: true, defaultValue: 'blue' }) value: string;

	paintedDisabled = false;

	@onUpdated(['disabled', 'effectiveDisabled'])
	protected paintDisabled(): void {
		this.paintedDisabled = this.effectiveDisabled;
	}

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = typeof state === 'string' ? state : '';
	}

	/** A second consumer of the base's internals: native constraint validation. */
	require(message: string): void {
		this.internals?.setValidity(this.value ? {} : { valueMissing: true }, message);
	}
}

@customElement('fae-range')
class RangeControl extends FormAssociatedElement {
	@prop({ type: Number, defaultValue: 25 }) low: number;
	@prop({ type: Number, defaultValue: 75 }) high: number;

	protected override formValue(): FormValue {
		if (!this.name) return null;
		const data = new FormData();
		data.append(this.name, String(this.low));
		data.append(`${this.name}-max`, String(this.high));
		return data;
	}

	protected override formState(): FormValue {
		return `${this.low},${this.high}`;
	}

	protected override restoreFormState(state: FormValue): void {
		const [low, high] = String(state).split(',').map(Number);
		this.low = low;
		this.high = high;
	}
}

async function mount(html: string): Promise<HTMLFormElement> {
	const form = document.createElement('form');
	form.innerHTML = html;
	document.body.append(form);
	await Promise.resolve();
	for (const host of form.querySelectorAll<FormAssociatedElement>('fae-tone, fae-range')) {
		await host.updateComplete;
	}
	return form;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('FormAssociatedElement in Chromium', () => {
	test('is form-associated through an inherited static getter', () => {
		expect(Reflect.get(ToneControl, 'formAssociated')).toBe(true);
		expect(document.createElement('fae-tone')).toBeInstanceOf(FormAssociatedElement);
	});

	test('submits a named host once and skips an unnamed one', async () => {
		const form = await mount('<fae-tone name="tone"></fae-tone><fae-tone></fae-tone>');

		expect(new FormData(form).getAll('tone')).toEqual(['blue']);
		expect([...new FormData(form).keys()]).toEqual(['tone']);
	});

	test('reflects name and follows a later rename', async () => {
		const form = await mount('<fae-tone></fae-tone>');
		const host = form.querySelector('fae-tone') as ToneControl;

		host.name = 'color';
		expect(host.getAttribute('name')).toBe('color');
		host.setAttribute('name', 'shade');
		expect(host.name).toBe('shade');
		expect(new FormData(form).get('shade')).toBe('blue');
	});

	test('syncs the submission value after the update cycle', async () => {
		const form = await mount('<fae-tone name="tone"></fae-tone>');
		const host = form.querySelector('fae-tone') as ToneControl;

		host.value = 'green';
		await host.updateComplete;

		expect(new FormData(form).get('tone')).toBe('green');
	});

	test('submits several entries through FormData and restores them from its state', async () => {
		const form = await mount('<fae-range name="price"></fae-range>');
		const host = form.querySelector('fae-range') as RangeControl;

		host.low = 10;
		host.high = 90;
		await host.updateComplete;
		expect(new FormData(form).getAll('price')).toEqual(['10']);
		expect(new FormData(form).get('price-max')).toBe('90');

		form.reset();

		expect([host.low, host.high]).toEqual([25, 75]);
		expect(new FormData(form).get('price')).toBe('25');
		expect(new FormData(form).get('price-max')).toBe('75');
	});

	test('leaves FormData while an ancestor fieldset is disabled', async () => {
		const form = await mount('<fieldset><fae-tone name="tone"></fae-tone></fieldset>');
		const fieldset = form.querySelector('fieldset')!;
		const host = form.querySelector('fae-tone') as ToneControl;

		fieldset.disabled = true;
		await host.updateComplete;

		expect(new FormData(form).get('tone')).toBeNull();
		expect(host.effectiveDisabled).toBe(true);
		expect(host.paintedDisabled).toBe(true);
		expect(host.disabled).toBe(false);
		expect(host.hasAttribute('disabled')).toBe(false);

		fieldset.disabled = false;
		await host.updateComplete;

		expect(host.effectiveDisabled).toBe(false);
		expect(host.paintedDisabled).toBe(false);
		expect(new FormData(form).get('tone')).toBe('blue');
	});

	test('keeps its own disabled attribute effective inside an enabled fieldset', async () => {
		const form = await mount('<fieldset disabled><fae-tone name="tone" disabled></fae-tone></fieldset>');
		const fieldset = form.querySelector('fieldset')!;
		const host = form.querySelector('fae-tone') as ToneControl;

		fieldset.disabled = false;
		await host.updateComplete;

		expect(host.effectiveDisabled).toBe(true);
		expect(new FormData(form).get('tone')).toBeNull();

		host.disabled = false;
		await host.updateComplete;

		expect(host.effectiveDisabled).toBe(false);
		expect(new FormData(form).get('tone')).toBe('blue');
	});

	test('resets to the value it held after its first update cycle', async () => {
		const form = document.createElement('form');
		const host = document.createElement('fae-tone') as ToneControl;
		host.name = 'tone';
		host.setAttribute('value', 'teal');
		form.append(host);
		document.body.append(form);
		host.value = 'navy';
		await host.updateComplete;

		host.value = 'red';
		await host.updateComplete;
		form.reset();

		expect(host.value).toBe('navy');
		expect(new FormData(form).get('tone')).toBe('navy');
	});

	test('does not move the reset value for a later programmatic write, like input.value', async () => {
		const form = await mount('<fae-tone name="tone" value="teal"></fae-tone><input name="text" value="a">');
		const host = form.querySelector('fae-tone') as ToneControl;
		const input = form.querySelector('input')!;

		host.value = 'red';
		input.value = 'b';
		await host.updateComplete;
		form.reset();

		expect(host.value).toBe('teal');
		expect(input.value).toBe('a');
		expect(new FormData(form).get('tone')).toBe('teal');
	});

	test('exposes its single ElementInternals to subclasses for validity', async () => {
		const form = await mount('<fae-tone name="tone"></fae-tone>');
		const host = form.querySelector('fae-tone') as ToneControl;

		host.value = '';
		host.require('Pick a tone');

		expect(form.checkValidity()).toBe(false);
		expect(host.matches(':invalid')).toBe(true);

		host.value = 'blue';
		host.require('Pick a tone');

		expect(form.checkValidity()).toBe(true);
	});
});
