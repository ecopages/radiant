import { describe, expect, it } from 'vitest';
import { createNumericRange } from '@/lib/numeric-range';
import {
	constrainSliderPair,
	formatSliderReadout,
	resolveSliderValues,
	seedSliderView,
	sliderTrackCssVars,
} from './slider.script';

describe('resolveSliderValues', () => {
	it('clamps a single thumb', () => {
		expect(
			resolveSliderValues({
				values: [150],
				min: 0,
				max: 100,
				step: 1,
			}),
		).toEqual([100]);
	});

	it('treats a two-value array as range without variant', () => {
		expect(
			resolveSliderValues({
				values: [80, 20],
				min: 0,
				max: 100,
				step: 1,
			}),
		).toEqual([20, 80]);
	});

	it('enforces minDistance on the upper thumb', () => {
		expect(
			resolveSliderValues({
				variant: 'range',
				values: [40, 45],
				min: 0,
				max: 100,
				step: 1,
				minDistance: 20,
			}),
		).toEqual([40, 60]);
	});
});

describe('formatSliderReadout', () => {
	it('joins range thumbs with an en dash', () => {
		expect(formatSliderReadout([25, 75], 1)).toBe('25 – 75');
	});
});

describe('seedSliderView', () => {
	it('uses a two-value array as the range', () => {
		const seed = seedSliderView({
			value: [10, 90],
			min: 0,
			max: 100,
			step: 1,
		});

		expect(seed.committed).toEqual([10, 90]);
		expect(seed.isRange).toBe(true);
		expect(seed.readoutText).toBe('10 – 90');
		expect(seed.variant).toBe('range');
	});

	it('seeds the default range pair from variant when value is omitted', () => {
		const seed = seedSliderView({
			variant: 'range',
			min: 0,
			max: 100,
			step: 1,
		});

		expect(seed.committed).toEqual([25, 75]);
		expect(seed.isRange).toBe(true);
		expect(seed.variant).toBe('range');
	});
});

describe('sliderTrackCssVars', () => {
	it('fills from zero for a single thumb', () => {
		const range = createNumericRange(0, 100, 1);
		expect(sliderTrackCssVars([50], range)).toMatchObject({
			'--rui-slider-fill-start': '0%',
			'--rui-slider-fill-size': '50%',
			'--rui-slider-value': '50%',
		});
	});
});

describe('constrainSliderPair', () => {
	const range = createNumericRange(0, 255, 1);

	it('stops End on the minimum thumb at minDistance from the maximum thumb', () => {
		expect(constrainSliderPair(range, 255, 200, 10, 'min')).toEqual([190, 200]);
	});

	it('stops Home on the maximum thumb at minDistance from the minimum thumb', () => {
		expect(constrainSliderPair(range, 10, 0, 10, 'max')).toEqual([10, 20]);
	});

	it('keeps swapping crossed thumbs when minDistance is 0', () => {
		expect(constrainSliderPair(range, 255, 200, 0, 'min')).toEqual([200, 255]);
		expect(constrainSliderPair(range, 10, 0, 0, 'max')).toEqual([0, 10]);
	});

	it('rounds the held thumb away from the other thumb when the step does not divide the gap', () => {
		const stepped = createNumericRange(0, 50, 5);
		expect(constrainSliderPair(stepped, 50, 50, 7, 'min')).toEqual([40, 50]);
		expect(constrainSliderPair(stepped, 0, 0, 7, 'max')).toEqual([0, 10]);
	});
});
