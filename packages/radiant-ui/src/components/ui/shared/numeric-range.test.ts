import { describe, expect, it } from 'vitest';
import { createNumericRange, valueFromSliderKey } from './numeric-range';

describe('createNumericRange', () => {
	it('anchors steps at the lower bound', () => {
		const range = createNumericRange(5, 35, 10);

		expect(range.clamp(14)).toBe(15);
		expect(range.clamp(35)).toBe(35);
	});

	it('normalizes reversed bounds and invalid step values', () => {
		const range = createNumericRange(100, 0, 0);

		expect(range.lowerBound).toBe(0);
		expect(range.upperBound).toBe(100);
		expect(range.step).toBe(1);
		expect(range.clamp(Number.NaN)).toBe(0);
	});

	it('converts unit ratios to stepped values', () => {
		const range = createNumericRange(0, 100, 10);

		expect(range.valueFromRatio(0.44)).toBe(40);
		expect(range.ratioFor(40)).toBe(0.4);
		expect(range.valueFromRatio(2)).toBe(100);
	});
});

describe('valueFromSliderKey', () => {
	it('steps, jumps, and ignores unrelated keys', () => {
		const range = createNumericRange(0, 100, 1);

		expect(valueFromSliderKey(range, 10, 'ArrowRight')).toBe(11);
		expect(valueFromSliderKey(range, 10, 'PageUp')).toBe(20);
		expect(valueFromSliderKey(range, 10, 'Home')).toBe(0);
		expect(valueFromSliderKey(range, 10, 'End')).toBe(100);
		expect(valueFromSliderKey(range, 10, 'Enter')).toBeUndefined();
	});
});
