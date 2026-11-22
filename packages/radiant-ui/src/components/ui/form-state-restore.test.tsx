import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiDateInput } from './date-input';
import { RuiDateInput as RuiDateInputElement } from './date-input/date-input.script';
import { RuiKnob } from './knob';
import { RuiKnob as RuiKnobElement } from './knob/knob.script';
import { RuiNumberField } from './number-field';
import { RuiNumberField as RuiNumberFieldElement } from './number-field/number-field.script';
import { RuiSlider } from './slider';
import { RuiSlider as RuiSliderElement } from './slider/slider.script';

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

async function mountForm(tag: string, content: JsxRenderable) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(<form>{content}</form>);
	cleanups.push(() => {
		root.unmount();
		host.remove();
	});
	await customElements.whenDefined(tag);
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
	return { form: host.querySelector('form') as HTMLFormElement, element: host.querySelector(tag) };
}

describe('form state restore of the form-associated controls', () => {
	it('restores a date input from its saved ISO value', async () => {
		const { form, element } = await mountForm(
			'rui-date-input',
			<RuiDateInput name="when" value="2026-08-20" locale="en-US" />,
		);
		if (!(element instanceof RuiDateInputElement)) throw new Error('missing date input');
		element.value = '2026-01-02';

		element.formStateRestoreCallback('2026-08-20', 'restore');

		expect(element.value).toBe('2026-08-20');
		expect(new FormData(form).get('when')).toBe('2026-08-20');
	});

	it('restores a number field from its saved number', async () => {
		const { form, element } = await mountForm('rui-number-field', <RuiNumberField name="quantity" value={3} />);
		if (!(element instanceof RuiNumberFieldElement)) throw new Error('missing number field');
		element.value = 9;

		element.formStateRestoreCallback('3', 'restore');

		expect(element.value).toBe(3);
		expect(new FormData(form).get('quantity')).toBe('3');
	});

	it('restores a knob from its saved number', async () => {
		const { form, element } = await mountForm('rui-knob', <RuiKnob name="gain" value={40} min={0} max={100} />);
		if (!(element instanceof RuiKnobElement)) throw new Error('missing knob');
		element.value = 80;

		element.formStateRestoreCallback('40', 'restore');

		expect(element.value).toBe(40);
		expect(new FormData(form).get('gain')).toBe('40');
	});

	it('restores a single slider and both ends of a range slider from the saved list', async () => {
		const single = await mountForm('rui-slider', <RuiSlider name="level" value={20} min={0} max={100} />);
		if (!(single.element instanceof RuiSliderElement)) throw new Error('missing slider');
		single.element.value = [70];
		single.element.formStateRestoreCallback('20', 'restore');
		expect(single.element.value).toEqual([20]);
		expect(new FormData(single.form).get('level')).toBe('20');

		const range = await mountForm(
			'rui-slider',
			<RuiSlider name="price" variant="range" value={[10, 30]} min={0} max={100} />,
		);
		if (!(range.element instanceof RuiSliderElement)) throw new Error('missing slider');
		range.element.value = [50, 60];
		range.element.formStateRestoreCallback('10,30', 'restore');
		expect(range.element.value).toEqual([10, 30]);
		expect(new FormData(range.form).get('price')).toBe('10');
		expect(new FormData(range.form).get('price-max')).toBe('30');
	});

	it('leaves a range slider alone when autofill hands it one value', async () => {
		const { element } = await mountForm(
			'rui-slider',
			<RuiSlider name="price" variant="range" value={[10, 30]} min={0} max={100} />,
		);
		if (!(element instanceof RuiSliderElement)) throw new Error('missing slider');

		element.formStateRestoreCallback('55', 'autocomplete');

		expect(element.value).toEqual([10, 30]);
	});
});
