import type { DatePartType } from './types';
import type { DateSegmentModel } from './segments';
import { maxSegmentLength } from './segments';

export type SegmentDigitResult = {
	segments: DateSegmentModel[];
	enteredKeys: string;
	focusNext: boolean;
};

function segmentIndex(segments: DateSegmentModel[], type: DatePartType): number {
	return segments.findIndex((segment) => segment.editable && segment.type === type);
}

function cloneSegments(segments: DateSegmentModel[]): DateSegmentModel[] {
	return segments.map((segment) => ({ ...segment }));
}

function updateSegment(
	segments: DateSegmentModel[],
	type: DatePartType,
	patch: Partial<DateSegmentModel>,
): DateSegmentModel[] {
	const next = cloneSegments(segments);
	const index = segmentIndex(next, type);
	if (index < 0) {
		return next;
	}
	next[index] = { ...next[index], ...patch };
	return next;
}

function parseDigits(raw: string): number | null {
	if (raw === '') {
		return null;
	}
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : null;
}

export function getSegmentBounds(type: DatePartType, segments: DateSegmentModel[]): { min: number; max: number } {
	return { min: 1, max: maxForPart(type, segments) };
}

function maxForPart(type: DatePartType, segments: DateSegmentModel[]): number {
	if (type === 'month') {
		return 12;
	}
	if (type === 'day') {
		const year = readPartNumber(segments, 'year');
		const month = readPartNumber(segments, 'month');
		if (year != null && month != null) {
			return new Date(year, month, 0).getDate();
		}
		return 31;
	}
	return 9999;
}

function readPartNumber(segments: DateSegmentModel[], type: DatePartType): number | null {
	const segment = segments.find((entry) => entry.editable && entry.type === type);
	if (!segment || segment.isPlaceholder || segment.value === '') {
		return null;
	}
	return Number(segment.value);
}

function padPart(type: DatePartType, value: number): string {
	if (type === 'year') {
		return String(value).padStart(4, '0');
	}
	return String(value).padStart(2, '0');
}

/** Visible label for a segment (`Month`, `Day`, `Year`). */
export function segmentAriaName(type: DatePartType, locale: string | string[] | undefined): string {
	try {
		const display = new Intl.DisplayNames(locale, { type: 'dateTimeField' });
		const name = display.of(type);
		if (name) {
			return name;
		}
	} catch {
		/* Intl.DisplayNames may be unavailable */
	}
	if (type === 'month') {
		return 'Month';
	}
	if (type === 'day') {
		return 'Day';
	}
	return 'Year';
}

export function segmentDisplayText(segment: DateSegmentModel): string {
	return segment.isPlaceholder || segment.value === '' ? segment.placeholder : segment.value;
}

export function segmentNumericValue(segment: DateSegmentModel): number | null {
	if (segment.isPlaceholder || segment.value === '') {
		return null;
	}
	return parseDigits(segment.value.replace(/\D/g, ''));
}

export function clearSegmentValue(segments: DateSegmentModel[], type: DatePartType): DateSegmentModel[] {
	return updateSegment(segments, type, { value: '', isPlaceholder: true });
}

export function setSegmentNumeric(segments: DateSegmentModel[], type: DatePartType, value: number): DateSegmentModel[] {
	return updateSegment(segments, type, {
		value: padPart(type, value),
		isPlaceholder: false,
	});
}

export function incrementSegmentValue(
	segments: DateSegmentModel[],
	type: DatePartType,
	delta: number,
): DateSegmentModel[] {
	const segment = segments.find((entry) => entry.editable && entry.type === type);
	if (!segment) {
		return segments;
	}

	const { min, max } = getSegmentBounds(type, segments);
	const current = segmentNumericValue(segment) ?? (delta > 0 ? min - 1 : max + 1);
	let next = current + delta;
	if (type === 'month' || type === 'day') {
		if (next < min) {
			next = max;
		} else if (next > max) {
			next = min;
		}
	} else {
		next = Math.max(min, next);
	}

	return setSegmentNumeric(segments, type, next);
}

/**
 * Applies one typed digit to a segment, mirroring React Aria `useDateSegment` entry rules.
 */
export function applyDigitToSegment(
	segments: DateSegmentModel[],
	type: DatePartType,
	key: string,
	enteredKeys: string,
): SegmentDigitResult {
	const digit = key.replace(/\D/g, '');
	if (!digit) {
		return { segments, enteredKeys, focusNext: false };
	}

	const newEntered = enteredKeys + digit;
	const parsed = parseDigits(newEntered);
	if (parsed == null) {
		return { segments, enteredKeys, focusNext: false };
	}

	const max = maxForPart(type, segments);
	let segmentValue = parsed;
	if (segmentValue > max) {
		segmentValue = parseDigits(digit) ?? segmentValue;
	}

	const width = maxSegmentLength(type);
	const shouldFocusNext =
		Number(`${segmentValue}0`) > max || newEntered.length >= width || String(segmentValue).length >= width;
	const displayValue = shouldFocusNext ? padPart(type, segmentValue) : String(segmentValue);
	const nextSegments = updateSegment(segments, type, {
		value: displayValue,
		isPlaceholder: false,
	});

	return {
		segments: nextSegments,
		enteredKeys: shouldFocusNext ? '' : newEntered,
		focusNext: shouldFocusNext,
	};
}

export function allSegmentsEmpty(segments: DateSegmentModel[]): boolean {
	return segments.every((segment) => !segment.editable || segment.isPlaceholder || segment.value === '');
}

export function getEditablePartTypes(segments: DateSegmentModel[]): DatePartType[] {
	return segments
		.filter((segment): segment is DateSegmentModel & { type: DatePartType } => segment.editable)
		.map((segment) => segment.type as DatePartType);
}

export function focusPartAfter(
	segments: DateSegmentModel[],
	type: DatePartType,
	direction: 1 | -1,
): DatePartType | null {
	const parts = getEditablePartTypes(segments);
	const index = parts.indexOf(type);
	if (index < 0) {
		return parts[0] ?? null;
	}
	const nextIndex = index + direction;
	if (nextIndex < 0 || nextIndex >= parts.length) {
		return null;
	}
	return parts[nextIndex] ?? null;
}

export function firstEmptyOrFirstPart(segments: DateSegmentModel[]): DatePartType | null {
	let first: DatePartType | null = null;

	for (const segment of segments) {
		if (!segment.editable) {
			continue;
		}

		const type = segment.type as DatePartType;
		if (!first) {
			first = type;
		}

		if (segment.isPlaceholder || segment.value === '') {
			return type;
		}
	}

	return first;
}

export type BackspaceSegmentResult =
	{ kind: 'focus-previous' } | { kind: 'updated'; segments: DateSegmentModel[]; enteredKeys: string };

/** Applies backspace semantics for one editable segment. */
export function applyBackspaceToSegment(segments: DateSegmentModel[], part: DatePartType): BackspaceSegmentResult {
	const segment = segments.find((entry) => entry.editable && entry.type === part);
	if (!segment) {
		return { kind: 'focus-previous' };
	}

	if (segment.isPlaceholder || segment.value === '') {
		return { kind: 'focus-previous' };
	}

	const digits = segment.value.replace(/\D/g, '');
	if (digits.length <= 1) {
		return { kind: 'updated', segments: clearSegmentValue(segments, part), enteredKeys: '' };
	}

	const next = digits.slice(0, -1);
	return {
		kind: 'updated',
		segments: segments.map((entry) =>
			entry.editable && entry.type === part ? { ...entry, value: next, isPlaceholder: false } : entry,
		),
		enteredKeys: next,
	};
}
