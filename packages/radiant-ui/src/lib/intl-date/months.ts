/**
 * Zero-based month index with year rollover.
 *
 * @example
 * ```ts
 * addMonths(2026, 11, 1); // { year: 2027, month: 0 }
 * ```
 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
	const date = new Date(year, month + delta, 1);
	return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * One month of a multi-month calendar: its year, zero-based month and offset from the first visible month.
 */
export type CalendarMonthView = {
	year: number;
	month: number;
	offset: number;
};

/**
 * Returns consecutive month views starting at `year`/`month`.
 *
 * @example
 * ```ts
 * getVisibleMonthViews(2026, 10, 2); // [{ year: 2026, month: 10, offset: 0 }, { year: 2026, month: 11, offset: 1 }]
 * ```
 */
export function getVisibleMonthViews(year: number, month: number, count: number): CalendarMonthView[] {
	const safeCount = Math.max(1, Math.min(count, 12));
	return Array.from({ length: safeCount }, (_, offset) => {
		const next = addMonths(year, month, offset);
		return { year: next.year, month: next.month, offset };
	});
}
