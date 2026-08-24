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

	it('formats fractional values without binary float noise', () => {
		const ring = createKnobRing(0.1 + 0.2, 0, 1, 0.1, 14, '{value}');

		expect(ring.valueText).toBe('0.3');
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
