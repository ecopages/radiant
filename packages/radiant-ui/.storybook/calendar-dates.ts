import { dateToIso } from '@/lib/intl-date';

function localDate(year: number, monthIndex: number, day: number): Date {
	return new Date(year, monthIndex, day);
}

function parts(now: Date): { year: number; monthIndex: number; day: number } {
	return { year: now.getFullYear(), monthIndex: now.getMonth(), day: now.getDate() };
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayIso(now = new Date()): string {
	return dateToIso(now);
}

/** A day-of-month in the current month as `YYYY-MM-DD`. */
export function monthDayIso(day: number, now = new Date()): string {
	const { year, monthIndex } = parts(now);
	return dateToIso(localDate(year, monthIndex, day));
}

/** Last day of the current month as `YYYY-MM-DD`. */
export function endOfMonthIso(now = new Date()): string {
	const { year, monthIndex } = parts(now);
	return dateToIso(localDate(year, monthIndex + 1, 0));
}

function parseIso(iso: string): { year: number; monthIndex: number; day: number } {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) {
		throw new Error(`Expected YYYY-MM-DD, received ${iso}`);
	}

	return { year: Number(match[1]), monthIndex: Number(match[2]) - 1, day: Number(match[3]) };
}

/** Shifts an ISO date by whole calendar days. */
export function addDaysIso(iso: string, days: number): string {
	const { year, monthIndex, day } = parseIso(iso);
	return dateToIso(localDate(year, monthIndex, day + days));
}

/** Shifts an ISO date by whole months, clamping the day to the target month. */
export function addMonthsIso(iso: string, months: number): string {
	const { year, monthIndex, day } = parseIso(iso);
	const target = localDate(year, monthIndex + months, 1);
	const lastDay = localDate(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	return dateToIso(localDate(target.getFullYear(), target.getMonth(), Math.min(day, lastDay)));
}

/** Visible day button for `iso`, or throws when that cell is not in the grid. */
export function calendarDayButton(root: ParentNode, iso: string): HTMLButtonElement {
	const day = root.querySelector(`[data-calendar-day][data-iso="${iso}"]`);
	if (!(day instanceof HTMLButtonElement)) {
		throw new Error(`Expected a visible calendar day for ${iso}`);
	}

	return day;
}
