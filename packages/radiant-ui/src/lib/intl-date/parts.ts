import { isoToDate } from './iso';
import type { DatePartType, IntlLocale } from './types';
import { getDateTimeFormat } from './formatters';
import {
	buildDateMaskPattern,
	extractMaskDigits as extractDateMaskDigits,
	maskDigitCapacity,
	maskedDigitsToParts,
	partsToDate,
} from '@/lib/mask/date-mask';

const REFERENCE_DATE = new Date(2001, 8, 3);

/**
 * Uses `formatToParts()` on a fixed reference date to discover the locale's
 * year/month/day field order (e.g. MDY for en-US, DMY for en-GB, YMD for ja-JP).
 */
export function getDatePartOrder(locale: IntlLocale): DatePartType[] {
	const parts = getDateTimeFormat(locale, {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).formatToParts(REFERENCE_DATE);

	return parts
		.filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
		.map((part) => part.type as DatePartType);
}

/** Literal separators between numeric date parts for the locale (e.g. `['/']` for en-US). */
export function getDateSeparators(locale: IntlLocale): string[] {
	const parts = getDateTimeFormat(locale, {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).formatToParts(REFERENCE_DATE);

	return parts.filter((part) => part.type === 'literal').map((part) => part.value);
}

function normalizeYear(value: number): number {
	if (value >= 100) {
		return value;
	}
	return value >= 69 ? 1900 + value : 2000 + value;
}

function buildDateFromParts(parts: Record<DatePartType, number>): Date | null {
	const year = parts.year;
	const month = parts.month;
	const day = parts.day;

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return null;
	}

	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	return date;
}

/**
 * Parses a user-typed date string according to locale conventions.
 *
 * Accepts ISO `YYYY-MM-DD`, masked numeric input (`08/21/2002`), locale-ordered
 * numeric input (`9/3/2026`), and text month names (`Aug 21, 2002`).
 */
export function parseLocaleDateString(input: string | null | undefined, locale: IntlLocale): Date | null {
	const trimmed = (input ?? '').trim();
	if (!trimmed) {
		return null;
	}

	const isoDate = isoToDate(trimmed);
	if (isoDate) {
		return isoDate;
	}

	const fromMask = parseMaskedInput(trimmed, locale);
	if (fromMask) {
		return fromMask;
	}

	const fromMonthName = parseDateWithMonthNames(trimmed, locale);
	if (fromMonthName) {
		return fromMonthName;
	}

	const order = getDatePartOrder(locale);
	const numbers = trimmed.match(/\d+/g);
	if (!numbers || numbers.length < 3) {
		return null;
	}

	const values: Record<DatePartType, number> = { day: 0, month: 0, year: 0 };
	for (let index = 0; index < 3; index += 1) {
		const partType = order[index];
		if (!partType) {
			return null;
		}

		let numeric = Number(numbers[index]);
		if (partType === 'year') {
			numeric = normalizeYear(numeric);
		}
		values[partType] = numeric;
	}

	return buildDateFromParts(values);
}

function parseMaskedInput(input: string, locale: IntlLocale): Date | null {
	const pattern = buildDateMaskPattern(locale);
	const digits = extractDateMaskDigits(input);
	if (digits.length < maskDigitCapacity(pattern)) {
		return null;
	}
	return partsToDate(maskedDigitsToParts(digits, locale) ?? {});
}

function getMonthNameLookup(locale: IntlLocale): Map<string, number> {
	const lookup = new Map<string, number>();
	for (const style of ['short', 'long'] as const) {
		for (let month = 0; month < 12; month += 1) {
			const label = getDateTimeFormat(locale, { month: style })
				.formatToParts(new Date(2020, month, 1))
				.find((part) => part.type === 'month')?.value;
			if (label) {
				lookup.set(label.toLowerCase(), month + 1);
			}
		}
	}
	return lookup;
}

function parseDateWithMonthNames(input: string, locale: IntlLocale): Date | null {
	const months = getMonthNameLookup(locale);
	const normalized = input.toLowerCase();

	for (const [name, month] of months) {
		const index = normalized.indexOf(name);
		if (index < 0) {
			continue;
		}

		const numbers = input.match(/\d+/g);
		if (!numbers || numbers.length < 2) {
			continue;
		}

		const yearToken = numbers.find((token) => token.length === 4) ?? numbers[numbers.length - 1];
		const dayToken = numbers.find((token) => token !== yearToken && Number(token) <= 31);
		if (!dayToken || !yearToken) {
			continue;
		}

		const year = normalizeYear(Number(yearToken));
		const day = Number(dayToken);
		return buildDateFromParts({ year, month, day });
	}

	return null;
}
