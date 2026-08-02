import type { DateDisplayStyle, IntlLocale } from './types';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function cacheKey(locale: IntlLocale, options: Intl.DateTimeFormatOptions): string {
	return `${JSON.stringify(locale ?? null)}|${JSON.stringify(options)}`;
}

/** Returns a cached `Intl.DateTimeFormat` for the given locale and options. */
export function getDateTimeFormat(locale: IntlLocale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = cacheKey(locale, options);
	const cached = formatterCache.get(key);
	if (cached) {
		return cached;
	}

	const formatter = new Intl.DateTimeFormat(locale, options);
	formatterCache.set(key, formatter);
	return formatter;
}

/** Formats a date for display using a `dateStyle` preset. */
export function formatDisplayDate(date: Date, locale: IntlLocale, style: DateDisplayStyle = 'medium'): string {
	return getDateTimeFormat(locale, { dateStyle: style }).format(date);
}

/** Formats the month and year shown in the calendar header. */
export function formatMonthYear(date: Date, locale: IntlLocale): string {
	return getDateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

/** Returns localized narrow weekday labels ordered by the locale's first day of week. */
export function getWeekdayLabels(locale: IntlLocale, weekStartsOn: number): string[] {
	const formatter = getDateTimeFormat(locale, { weekday: 'narrow' });
	const labels: string[] = [];

	for (let offset = 0; offset < 7; offset += 1) {
		const dayIndex = (weekStartsOn + offset) % 7;
		const reference = new Date(2024, 0, dayIndex === 0 ? 7 : dayIndex);
		labels.push(formatter.format(reference));
	}

	return labels;
}

/** Formats a date range for display using a `dateStyle` preset. */
export function formatDateRange(
	start: Date,
	end: Date,
	locale: IntlLocale,
	style: DateDisplayStyle = 'medium',
): string {
	const formatter = getDateTimeFormat(locale, { dateStyle: style });
	if (typeof formatter.formatRange === 'function') {
		return formatter.formatRange(start, end);
	}
	return `${formatter.format(start)} – ${formatter.format(end)}`;
}

/** Localized label for the "today" shortcut (e.g. "today", "vandaag"). */
export function formatTodayLabel(locale: IntlLocale): string {
	return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day');
}
