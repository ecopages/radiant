import { describe, expect, it } from 'vitest';
import {
	createNumericRange,
	formatNumericValue,
	fractionDigitsFromStep,
	resolveValuePrecision,
	valueFromSliderKey,
	valuesAlignOnStep,
} from './numeric-range';

describe('createNumericRange', () => {
	it('distinguishes off-step values from floating-point noise', () => {
		expect(valuesAlignOnStep(50.4, 50, 1)).toBe(false);
		expect(valuesAlignOnStep(0.34, 0.3, 0.1)).toBe(false);
		expect(valuesAlignOnStep(1e-16, 2e-16, 1e-16)).toBe(false);
		expect(valuesAlignOnStep(0.1 + 0.2, 0.3, 0.1)).toBe(true);
	});

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

	it('snaps to the step without rounding committed values', () => {
		const range = createNumericRange(0, 1, 0.1);
		const value = range.clamp(0.1 + 0.2);

		expect(value).toBeCloseTo(0.3, 10);
		expect(value).not.toBe(0.3);
		expect(formatNumericValue(value, 1)).toBe('0.3');
		expect(valuesAlignOnStep(value, 0.3, 0.1)).toBe(true);
		expect(valuesAlignOnStep(0.343, createNumericRange(0, 1, 0.001).clamp(0.343), 0.001)).toBe(true);
		expect(valuesAlignOnStep(0.343, 0.344, 0.001)).toBe(false);

		let stepped = 0;
		for (let index = 0; index < 3; index += 1) {
			stepped = range.clamp(stepped + range.step);
		}
		expect(stepped).toBeCloseTo(0.3, 10);
		expect(formatNumericValue(stepped, 1)).toBe('0.3');
	});
});

describe('resolveValuePrecision', () => {
	it('defaults to the decimal places in step', () => {
		expect(resolveValuePrecision(0.1, undefined)).toBe(1);
		expect(resolveValuePrecision(1, undefined)).toBe(0);
	});

	it('honors an explicit readout precision', () => {
		expect(resolveValuePrecision(0.001, 2)).toBe(2);
	});
});

describe('formatNumericValue', () => {
	it('formats readouts without changing the stored value', () => {
		const value = 0.1 + 0.2;

		expect(value).not.toBe(0.3);
		expect(formatNumericValue(value, 1)).toBe('0.3');
		expect(formatNumericValue(0.343493934, 2)).toBe('0.34');
	});
});

describe('fractionDigitsFromStep', () => {
	it('reads decimal and scientific-notation steps', () => {
		expect(fractionDigitsFromStep(1)).toBe(0);
		expect(fractionDigitsFromStep(0.01)).toBe(2);
		expect(fractionDigitsFromStep(1e-7)).toBe(7);
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
