import { applyInputMask, maskInputSlotCount, parseMaskPattern } from './input-mask';
import { getDateTimeFormat } from '@/lib/intl-date/formatters';
import type { DatePartType, IntlLocale } from '@/lib/intl-date/types';

/** IMask pattern for locale date digits (`0` = digit slot). */
export type DateMaskPattern = string;

const REFERENCE_DATE = new Date(2001, 8, 3);

function getNumericPartOrder(locale: IntlLocale): DatePartType[] {
	return getDateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
		.formatToParts(REFERENCE_DATE)
		.filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
		.map((part) => part.type as DatePartType);
}

/**
 * Builds a mask pattern from `formatToParts()` (e.g. `00/00/0000` for en-US).
 *
 * Consecutive `0` runs map to month, day, or year in locale order.
 */
export function buildDateMaskPattern(locale: IntlLocale): DateMaskPattern {
	const parts = getDateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(REFERENCE_DATE);

	let pattern = '';
	for (const part of parts) {
		if (part.type === 'literal') {
			pattern += part.value;
			continue;
		}
		if (part.type === 'month' || part.type === 'day' || part.type === 'year') {
			pattern += part.value.replace(/\d/g, '0');
		}
	}
	return pattern;
}

/** Human-readable placeholder derived from the locale mask (e.g. `mm/dd/yyyy`). */
export function getDefaultDatePlaceholder(locale: IntlLocale): string {
	const parts = getDateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(REFERENCE_DATE);

	return parts
		.map((part) => {
			if (part.type === 'literal') {
				return part.value;
			}
			if (part.type === 'year') {
				return 'yyyy';
			}
			if (part.type === 'month') {
				return 'mm';
			}
			if (part.type === 'day') {
				return 'dd';
			}
			return '';
		})
		.join('');
}

/** @deprecated Use `getDefaultDatePlaceholder`. */
export function maskPatternToPlaceholder(pattern: DateMaskPattern): string {
	return pattern.replace(/0/g, '·');
}

/** Strips non-digits from user input. */
export function extractMaskDigits(value: string): string {
	return value.replace(/\D/g, '');
}

/**
 * Applies `digits` to a mask pattern, inserting literals as needed.
 *
 * @example
 * applyDateMask('08212002', '00/00/0000') // → '08/21/2002'
 */
export function applyDateMask(digits: string, pattern: DateMaskPattern): string {
	return applyInputMask(extractMaskDigits(digits), pattern);
}

/** Maximum number of digit slots in a mask pattern. */
export function maskDigitCapacity(pattern: DateMaskPattern): number {
	return maskInputSlotCount(parseMaskPattern(pattern), { requiredOnly: true });
}

function normalizeYear(value: number): number {
	if (value >= 100) {
		return value;
	}
	return value >= 69 ? 1900 + value : 2000 + value;
}

/** Maps masked digits back to year/month/day using the locale field order. */
export function maskedDigitsToParts(
	digits: string,
	locale: IntlLocale,
): Partial<Record<DatePartType, number>> | null {
	const order = getNumericPartOrder(locale);
	let cursor = 0;
	const values: Partial<Record<DatePartType, number>> = {};

	for (const type of order) {
		const width = type === 'year' ? 4 : 2;
		const slice = digits.slice(cursor, cursor + width);
		if (slice.length < width) {
			return null;
		}
		let numeric = Number(slice);
		if (type === 'year') {
			numeric = normalizeYear(numeric);
		}
		values[type] = numeric;
		cursor += width;
	}

	return values;
}

export function partsToDate(parts: Partial<Record<DatePartType, number>>): Date | null {
	if (parts.year == null || parts.month == null || parts.day == null) {
		return null;
	}

	const date = new Date(parts.year, parts.month - 1, parts.day);
	if (
		date.getFullYear() !== parts.year ||
		date.getMonth() !== parts.month - 1 ||
		date.getDate() !== parts.day
	) {
		return null;
	}

	return date;
}

export { getNumericPartOrder };
