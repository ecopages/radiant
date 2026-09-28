/** Zero-based month index with year rollover. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
	const date = new Date(year, month + delta, 1);
	return { year: date.getFullYear(), month: date.getMonth() };
}

export type CalendarMonthView = {
	year: number;
	month: number;
	offset: number;
};

/** Returns consecutive month views starting at `year`/`month`. */
export function getVisibleMonthViews(year: number, month: number, count: number): CalendarMonthView[] {
	const safeCount = Math.max(1, Math.min(count, 12));
	return Array.from({ length: safeCount }, (_, offset) => {
		const next = addMonths(year, month, offset);
		return { year: next.year, month: next.month, offset };
	});
}
