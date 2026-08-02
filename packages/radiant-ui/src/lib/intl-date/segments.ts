import { getDateTimeFormat } from './formatters';
import type { DateGranularity, DatePartType, IntlLocale } from './types';

export type DateSegmentType = DatePartType | 'literal';

/** @experimental Segment model reserved for a future segment-editor field. */
export type DateSegmentModel = {
	type: DateSegmentType;
	/** Visible text for literals; numeric string for editable segments. */
	value: string;
	placeholder: string;
	isPlaceholder: boolean;
	editable: boolean;
};

const PLACEHOLDER_DATE = new Date(2000, 0, 1);

function granularityIncludes(granularity: DateGranularity, part: DatePartType): boolean {
	if (granularity === 'year') {
		return part === 'year';
	}
	if (granularity === 'month') {
		return part === 'year' || part === 'month';
	}
	return true;
}

function placeholderForPart(type: DatePartType, locale: IntlLocale): string {
	const sample = getDateTimeFormat(locale, { [type]: type === 'year' ? 'numeric' : '2-digit' }).formatToParts(
		PLACEHOLDER_DATE,
	);
	const part = sample.find((entry) => entry.type === type);
	if (!part) {
		return type === 'year' ? 'yyyy' : 'mm';
	}
	return part.value.replace(/\d/g, type === 'year' ? 'y' : type === 'month' ? 'm' : 'd');
}

function formatPartValue(type: DatePartType, date: Date, locale: IntlLocale): string {
	const options: Intl.DateTimeFormatOptions = type === 'year' ? { year: 'numeric' } : { [type]: '2-digit' };
	return (
		getDateTimeFormat(locale, options)
			.formatToParts(date)
			.find((part) => part.type === type)?.value ?? ''
	);
}

/**
 * Builds locale-ordered date segments from `Intl.DateTimeFormat.prototype.formatToParts()`.
 *
 * @remarks Mirrors the React Aria `DateInput` segment list — literals plus editable fields.
 * @experimental Reserved for a future segment-editor field.
 */
export function buildDateSegments(
	date: Date | null,
	locale: IntlLocale,
	options: { granularity?: DateGranularity; placeholderDate?: Date } = {},
): DateSegmentModel[] {
	const granularity = options.granularity ?? 'day';
	const reference = date ?? options.placeholderDate ?? new Date();
	const parts = getDateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(reference);

	return parts
		.filter((part) => part.type !== 'era')
		.map((part) => {
			if (part.type === 'literal') {
				return {
					type: 'literal',
					value: part.value,
					placeholder: part.value,
					isPlaceholder: false,
					editable: false,
				};
			}

			const type = part.type as DatePartType;
			if (!granularityIncludes(granularity, type)) {
				return null;
			}

			const hasValue = date != null;
			return {
				type,
				value: hasValue ? formatPartValue(type, date, locale) : '',
				placeholder: placeholderForPart(type, locale),
				isPlaceholder: !hasValue,
				editable: true,
			};
		})
		.filter((segment): segment is DateSegmentModel => segment != null);
}

function parseSegmentNumber(segment: DateSegmentModel): number | null {
	if (segment.isPlaceholder || segment.value === '') {
		return null;
	}
	const parsed = Number(segment.value);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeYear(value: number): number {
	if (value >= 100) {
		return value;
	}
	return value >= 69 ? 1900 + value : 2000 + value;
}

/**
 * Converts editable segment values into a local calendar `Date`, or `null` when incomplete.
 *
 * @experimental Reserved for a future segment-editor field.
 */
export function segmentsToDate(segments: DateSegmentModel[]): Date | null {
	const values: Partial<Record<DatePartType, number>> = {};

	for (const segment of segments) {
		if (!segment.editable) {
			continue;
		}
		const numeric = parseSegmentNumber(segment);
		if (numeric == null) {
			return null;
		}
		values[segment.type as DatePartType] = segment.type === 'year' ? normalizeYear(numeric) : numeric;
	}

	if (values.year == null || values.month == null || values.day == null) {
		return null;
	}

	const date = new Date(values.year, values.month - 1, values.day);
	if (date.getFullYear() !== values.year || date.getMonth() !== values.month - 1 || date.getDate() !== values.day) {
		return null;
	}

	return date;
}

/** @experimental Reserved for a future segment-editor field. */
export function getEditableSegmentIndices(segments: DateSegmentModel[]): number[] {
	return segments.map((segment, index) => (segment.editable ? index : -1)).filter((index) => index >= 0);
}

export function maxSegmentLength(type: DatePartType): number {
	if (type === 'year') {
		return 4;
	}
	return 2;
}

export function clampSegmentValue(type: DatePartType, raw: string): string {
	const digits = raw.replace(/\D/g, '');
	return digits.slice(0, maxSegmentLength(type));
}

export function incrementSegment(type: DatePartType, value: string, delta: number): string {
	const numeric = Number(value || '0') + delta;
	if (type === 'month') {
		const wrapped = ((numeric - 1 + 12) % 12) + 1;
		return String(wrapped).padStart(2, '0');
	}
	if (type === 'day') {
		const wrapped = ((numeric - 1 + 31) % 31) + 1;
		return String(wrapped).padStart(2, '0');
	}
	const next = Math.max(1, numeric);
	return String(next).padStart(4, '0').slice(-4);
}
