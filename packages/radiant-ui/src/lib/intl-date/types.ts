/**
 * A BCP 47 tag, a list of them, or `undefined` for the runtime default.
 */
export type IntlLocale = string | string[] | undefined;

/**
 * A numeric part of a date.
 */
export type DatePartType = 'day' | 'month' | 'year';

/**
 * The `dateStyle` presets of `Intl.DateTimeFormat`.
 */
export type DateDisplayStyle = 'short' | 'medium' | 'long' | 'full';

/** Smallest displayed unit — mirrors React Aria `granularity`. */
export type DateGranularity = 'day' | 'month' | 'year';

/**
 * One day of a month grid: its date and ISO string, whether it is in the month, today, selected or disabled, and its place in a range.
 */
export type CalendarDayCell = {
	date: Date;
	iso: string;
	inMonth: boolean;
	isToday: boolean;
	isSelected: boolean;
	isDisabled: boolean;
	isRangeStart: boolean;
	isRangeEnd: boolean;
	isRangeMiddle: boolean;
};

/**
 * Seven day cells, in the locale's week order.
 */
export type CalendarWeek = CalendarDayCell[];
