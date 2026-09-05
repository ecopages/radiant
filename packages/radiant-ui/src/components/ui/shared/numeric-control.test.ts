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
