export const SLIDER_PAGE_STEP_MULTIPLIER = 10;

export type NumericRange = {
	lowerBound: number;
	upperBound: number;
	step: number;
	clamp: (value: number) => number;
	ratioFor: (value: number) => number;
	valueFromRatio: (ratio: number) => number;
};

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
