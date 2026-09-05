export const SLIDER_PAGE_STEP_MULTIPLIER = 10;

/**
 * Maximum fraction digits for slider and knob readouts.
 *
 * @remarks
 * IEEE-754 doubles cannot uniquely represent more than this many fraction digits,
 * so `toFixed` beyond it only restates binary noise.
 */
export const MAX_VALUE_FRACTION_DIGITS = 15;

export type NumericRange = {
	lowerBound: number;
	upperBound: number;
	step: number;
	clamp: (value: number) => number;
	ratioFor: (value: number) => number;
	valueFromRatio: (ratio: number) => number;
};

/**
 * Decimal places in a step interval, used as the default readout precision.
 */
export function fractionDigitsFromStep(step: number): number {
	if (!Number.isFinite(step) || step <= 0) {
		return 0;
	}

	const match = step.toString().match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
	if (!match) {
		return 0;
	}

	const decimals = match[1]?.length ?? 0;
	const exponent = match[2] ? Number(match[2]) : 0;
	return Math.min(MAX_VALUE_FRACTION_DIGITS, Math.max(0, decimals - exponent));
}

/**
 * Resolves readout fraction digits from `valuePrecision` or the decimal places in `step`.
 */
export function resolveValuePrecision(step: number, valuePrecision: number | undefined): number {
	if (typeof valuePrecision === 'number' && Number.isFinite(valuePrecision) && valuePrecision >= 0) {
		return Math.min(MAX_VALUE_FRACTION_DIGITS, Math.round(valuePrecision));
	}

	return fractionDigitsFromStep(step);
}

/** Formats a numeric value for readouts, tooltips, and `aria-valuetext`. */
export function formatNumericValue(value: number, valuePrecision: number): string {
	return Number.isFinite(value) ? value.toFixed(valuePrecision) : '';
}

/**
 * Whether two values sit on the same step tick after binary rounding.
 *
 * @remarks IEEE-754 noise can make `clamp(x) !== x` even when both stringify to
 * the same step. Writing the clamped number back into a reflected `value`
 * attribute then oscillates forever (`0.3` ↔ `0.30000000000000004`).
 */
export function valuesAlignOnStep(left: number, right: number, step: number): boolean {
	if (Object.is(left, right)) {
		return true;
	}
	if (!Number.isFinite(left) || !Number.isFinite(right)) {
		return false;
	}

	const resolvedStep = Number.isFinite(step) && step > 0 ? step : 1;
	const roundingNoise = Number.EPSILON * Math.max(Math.abs(left), Math.abs(right), resolvedStep) * 4;
	return Math.abs(left - right) <= Math.min(roundingNoise, resolvedStep * 1e-6);
}

/** Normalizes numeric-control bounds and step values into a stable interaction model. */
export function createNumericRange(min: number, max: number, step: number): NumericRange {
	const resolvedMin = Number.isFinite(min) ? min : 0;
	const resolvedMax = Number.isFinite(max) ? max : 100;
	const lowerBound = Math.min(resolvedMin, resolvedMax);
	const upperBound = Math.max(resolvedMin, resolvedMax);
	const resolvedStep = Number.isFinite(step) && step > 0 ? step : 1;
	const span = upperBound - lowerBound;

	const clamp = (value: number): number => {
		const candidate = Number.isFinite(value) ? value : lowerBound;
		const stepped = lowerBound + Math.round((candidate - lowerBound) / resolvedStep) * resolvedStep;
		return Math.min(upperBound, Math.max(lowerBound, stepped));
	};

	return {
		lowerBound,
		upperBound,
		step: resolvedStep,
		clamp,
		ratioFor: (value) => (span === 0 ? 0 : (clamp(value) - lowerBound) / span),
		valueFromRatio: (ratio) => {
			const unit = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
			return clamp(lowerBound + unit * span);
		},
	};
}

/**
 * Maps WAI-ARIA slider keys onto a stepped value.
 *
 * @returns `undefined` when the key is not part of the slider model.
 */
export function valueFromSliderKey(range: NumericRange, current: number, key: string): number | undefined {
	switch (key) {
		case 'ArrowRight':
		case 'ArrowUp':
			return range.clamp(current + range.step);
		case 'ArrowLeft':
		case 'ArrowDown':
			return range.clamp(current - range.step);
		case 'Home':
			return range.lowerBound;
		case 'End':
			return range.upperBound;
		case 'PageUp':
			return range.clamp(current + range.step * SLIDER_PAGE_STEP_MULTIPLIER);
		case 'PageDown':
			return range.clamp(current - range.step * SLIDER_PAGE_STEP_MULTIPLIER);
		default:
			return undefined;
	}
}
