import { expect, it } from 'vitest';
import { RuiKnob } from '../knob/knob.script';
import { RuiSlider } from '../slider/slider.script';

it.each([
	['slider', RuiSlider],
	['knob', RuiKnob],
] as const)('normalizes authored and assigned off-step values on %s', async (_name, Control) => {
	const control = new Control();
	control.setAttribute('value', '50.4');
	control.setAttribute('step', '1');
	document.body.append(control);
	try {
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(control.value).toBe(50);
		expect(control.getAttribute('value')).toBe('50');
		control.value = 20.3;
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(control.value).toBe(20);
		expect(control.getAttribute('value')).toBe('20');
	} finally {
		control.remove();
	}
});

it('keeps a fractional knob value when step arrives in the same turn', async () => {
	const control = new RuiKnob();
	document.body.append(control);
	try {
		control.value = 0.2;
		control.min = 0;
		control.max = 1;
		control.step = 0.1;
		await Promise.resolve();
		expect(control.value).toBeCloseTo(0.2, 10);
	} finally {
		control.remove();
	}
});
