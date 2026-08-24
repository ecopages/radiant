export const SLIDER_PAGE_STEP_MULTIPLIER = 10;

/**
 * Maximum fraction digits applied when snapping slider and knob values.
 *
 * @remarks
 * IEEE-754 doubles cannot uniquely represent more than this many fraction digits,
 * so `toFixed` beyond it only restates binary noise.
 */
export const MAX_VALUE_FRACTION_DIGITS = 15;

/** Transforms a snapped numeric value before it is committed. */
export type NumericValueParser = (value: number) => number;

export type NumericRangeOptions = {
	/**
	 * Maximum fraction digits on committed values.
	 * Defaults to the decimal places in `step`.
	 */
	precision?: number;
	/** Transforms the snapped value before it is committed. */
	parseValue?: NumericValueParser;
};

export type NumericRange = {
	lowerBound: number;
	upperBound: number;
	step: number;
	precision: number;
	clamp: (value: number) => number;
	format: (value: number) => string;
	ratioFor: (value: number) => number;
	valueFromRatio: (ratio: number) => number;
};

/**
 * Decimal places in a step interval, used as the default value precision.
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

function resolvePrecision(step: number, precision: number | undefined): number {
	if (typeof precision === 'number' && Number.isFinite(precision) && precision >= 0) {
		return Math.min(MAX_VALUE_FRACTION_DIGITS, Math.round(precision));
	}

	return fractionDigitsFromStep(step);
}

function roundToPrecision(value: number, precision: number): number {
	if (!Number.isFinite(value)) {
		return value;
	}

	if (precision <= 0) {
		return Math.round(value);
	}

	return Number(value.toFixed(precision));
}

/** Normalizes numeric-control bounds and step values into a stable interaction model. */
export function createNumericRange(
	min: number,
	max: number,
	step: number,
	options: NumericRangeOptions = {},
): NumericRange {
	const resolvedMin = Number.isFinite(min) ? min : 0;
	const resolvedMax = Number.isFinite(max) ? max : 100;
	const lowerBound = Math.min(resolvedMin, resolvedMax);
	const upperBound = Math.max(resolvedMin, resolvedMax);
	const resolvedStep = Number.isFinite(step) && step > 0 ? step : 1;
	const span = upperBound - lowerBound;
	const precision = resolvePrecision(resolvedStep, options.precision);
	const parseValue = typeof options.parseValue === 'function' ? options.parseValue : undefined;

	const clamp = (value: number): number => {
		const candidate = Number.isFinite(value) ? value : lowerBound;
		const stepped = lowerBound + Math.round((candidate - lowerBound) / resolvedStep) * resolvedStep;
		const bounded = Math.min(upperBound, Math.max(lowerBound, stepped));
		const rounded = roundToPrecision(bounded, precision);
		const parsed = parseValue ? parseValue(rounded) : rounded;
		const finite = Number.isFinite(parsed) ? parsed : rounded;
		return Math.min(upperBound, Math.max(lowerBound, finite));
	};

	return {
		lowerBound,
		upperBound,
		step: resolvedStep,
		precision,
		clamp,
		format: (value) => (Number.isFinite(value) ? value.toFixed(precision) : ''),
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
