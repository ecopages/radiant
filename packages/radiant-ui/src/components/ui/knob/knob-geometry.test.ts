import { describe, expect, it } from 'vitest';
import { createNumericRange } from '../shared/numeric-range';
import { createKnobRing, KNOB_ARC_ANGLE, knobValueFromPointer } from './knob-geometry';

describe('createKnobRing', () => {
	it('sizes the progress arc from the numeric ratio', () => {
		const ring = createKnobRing(50, 0, 100, 1, 14, '{value}%');

		expect(ring.progressLength).toBeCloseTo(ring.arcLength * 0.5);
		expect(ring.arcLength).toBeCloseTo((KNOB_ARC_ANGLE / 360) * ring.circumference);
		expect(ring.valueText).toBe('50%');
	});

	it('formats the readout independently of the stored value', () => {
		const noisy = 0.1 + 0.2;
		const range = createNumericRange(0, 1, 0.1);
		const stored = range.clamp(noisy);
		const ring = createKnobRing(noisy, 0, 1, 0.1, 14, '{value}');

		expect(stored).toBeCloseTo(0.3, 10);
		expect(stored).not.toBe(0.3);
		expect(ring.valueText).toBe('0.3');
	});

	it('caps readout digits with valuePrecision without changing the stored value', () => {
		const value = 0.343493934;
		const range = createNumericRange(0, 1, 0.000001);
		const stored = range.clamp(value);
		const ring = createKnobRing(value, 0, 1, 0.000001, 14, '{value}', 2);

		expect(stored).toBeCloseTo(0.343494, 6);
		expect(ring.valueText).toBe('0.34');
	});
});

describe('knobValueFromPointer', () => {
	it('snaps the inactive gap to the nearest endpoint', () => {
		const range = createNumericRange(0, 100, 1);
		const rect = new DOMRect(0, 0, 100, 100);

		expect(knobValueFromPointer(33, 99, rect, range)).toBe(0);
		expect(knobValueFromPointer(59, 99, rect, range)).toBe(100);
	});
});
