import { describe, expect, it } from 'vitest';
import { createNumericRange } from '../shared/numeric-range';
import { formatSliderReadout, resolveSliderValues, seedSliderView, sliderTrackCssVars } from './slider.script';

describe('resolveSliderValues', () => {
	it('clamps a single thumb', () => {
		expect(
			resolveSliderValues({
				value: 150,
				rangeMin: 25,
				rangeMax: 75,
				min: 0,
				max: 100,
				step: 1,
			}),
		).toEqual([100]);
	});

	it('orders inverted range thumbs', () => {
		expect(
			resolveSliderValues({
				variant: 'range',
				value: 50,
				rangeMin: 80,
				rangeMax: 20,
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
				value: 50,
				rangeMin: 40,
				rangeMax: 45,
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
	it('prefers the values tuple over rangeMin/rangeMax', () => {
		const seed = seedSliderView({
			variant: 'range',
			values: [10, 90],
			value: 50,
			rangeMin: 25,
			rangeMax: 75,
			min: 0,
			max: 100,
			step: 1,
		});

		expect(seed.committed).toEqual([10, 90]);
		expect(seed.isRange).toBe(true);
		expect(seed.readoutText).toBe('10 – 90');
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
