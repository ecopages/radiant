import { createNumericRange, type NumericRange, type NumericRangeOptions } from '../shared/numeric-range';

export const KNOB_START_ANGLE = 120;
export const KNOB_ARC_ANGLE = 300;
export const KNOB_DEFAULT_STROKE_WIDTH = 14;

const KNOB_GAP_MIDPOINT = KNOB_ARC_ANGLE + (360 - KNOB_ARC_ANGLE) / 2;

export type KnobRingGeometry = {
	startAngle: number;
	strokeWidth: number;
	radius: number;
	circumference: number;
	arcLength: number;
	progressLength: number;
	valueText: string;
};

export function resolveKnobStrokeWidth(strokeWidth: number | undefined): number {
	return Math.min(100, Math.max(0, Number.isFinite(strokeWidth) ? Number(strokeWidth) : KNOB_DEFAULT_STROKE_WIDTH));
}

export function formatKnobValue(value: number, precision: number, template: string): string {
	return template.replace('{value}', value.toFixed(precision));
}

export function createKnobRing(
	value: number,
	min: number,
	max: number,
	step: number,
	strokeWidth: number | undefined,
	valueTemplate: string,
	options?: NumericRangeOptions,
): KnobRingGeometry {
	const range = createNumericRange(min, max, step, options);
	const resolvedStrokeWidth = resolveKnobStrokeWidth(strokeWidth);
	const radius = 50 - resolvedStrokeWidth / 2;
	const circumference = 2 * Math.PI * radius;
	const arcLength = (KNOB_ARC_ANGLE / 360) * circumference;
	const clamped = range.clamp(value);

	return {
		startAngle: KNOB_START_ANGLE,
		strokeWidth: resolvedStrokeWidth,
		radius,
		circumference,
		arcLength,
		progressLength: range.ratioFor(clamped) * arcLength,
		valueText: formatKnobValue(clamped, range.precision, valueTemplate),
	};
}

/**
 * @remarks The inactive gap snaps to the nearest endpoint so pointer travel
 * through the gap cannot jump across the value range.
 */
export function knobValueFromPointer(
	clientX: number,
	clientY: number,
	rect: DOMRect,
	range: NumericRange,
): number | null {
	if (rect.width === 0 || rect.height === 0) {
		return null;
	}

	const pointerAngle =
		(Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
	const alongArc = (pointerAngle - KNOB_START_ANGLE + 360) % 360;
	const clampedAlong = alongArc <= KNOB_ARC_ANGLE ? alongArc : alongArc <= KNOB_GAP_MIDPOINT ? KNOB_ARC_ANGLE : 0;
	return range.valueFromRatio(clampedAlong / KNOB_ARC_ANGLE);
}
