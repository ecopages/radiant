export type IntlLocale = string | string[] | undefined;

export type DatePartType = 'day' | 'month' | 'year';

export type DateDisplayStyle = 'short' | 'medium' | 'long' | 'full';

/** Smallest displayed unit — mirrors React Aria `granularity`. */
export type DateGranularity = 'day' | 'month' | 'year';

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

export type CalendarWeek = CalendarDayCell[];
