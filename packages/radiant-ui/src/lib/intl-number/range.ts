/**
 * Snap `value` to the nearest step within `[min, max]`.
 *
 * @remarks
 * When `min` is non-finite (NumberField default `-Infinity`), use `0` as the
 * step origin. `Math.round((value - (-Infinity)) / step)` is `NaN` and would
 * collapse every stepper commit to an invalid number.
 */
export function snapToStep(value: number, min: number, max: number, step: number): number {
	if (!Number.isFinite(value)) {
		return Number.isFinite(min) ? min : 0;
	}

	if (!Number.isFinite(step) || step === 0) {
		return clampToRange(value, min, max);
	}

	const origin = Number.isFinite(min) ? min : 0;
	const stepped = Math.round((value - origin) / step) * step + origin;
	return clampToRange(stepped, min, max);
}

function clampToRange(value: number, min: number, max: number): number {
	let next = value;
	if (Number.isFinite(min)) {
		next = Math.max(min, next);
	}
	if (Number.isFinite(max)) {
		next = Math.min(max, next);
	}
	return next;
}

export function isWithinRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

export function isOnStep(value: number, min: number, step: number): boolean {
	const origin = Number.isFinite(min) ? min : 0;
	return (
		Math.abs((value - origin) % step) < Number.EPSILON ||
		Math.abs(((value - origin) % step) - step) < Number.EPSILON
	);
}
