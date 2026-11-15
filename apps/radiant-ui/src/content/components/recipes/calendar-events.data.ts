import { buildCalendarMonth, formatDisplayDate } from '@ecopages/radiant-ui/helpers';

export type CalendarEvent = { id: string; iso: string; title: string };

export const locale = 'en-US';
export const month = new Date(2026, 10, 1);
export const weeks = buildCalendarMonth(month.getFullYear(), month.getMonth(), { locale });

const days = new Map(weeks.flat().map((day) => [day.iso, day]));

/**
 * The accessible name of a day cell: the full date, then how many events it holds.
 *
 * @remarks
 * A `gridcell` named by `aria-label` is announced by that name alone, not by its content, so the count has to be in it.
 */
export function dayLabel(date: Date, count: number): string {
	const events = count === 0 ? '' : `, ${count} ${count === 1 ? 'event' : 'events'}`;
	return `${formatDisplayDate(date, locale, 'full')}${events}`;
}

/**
 * Fills a day cell with its number and one node per event, and names the cell after both.
 *
 * @remarks
 * The nodes are built with `textContent`, so an event title is text and is never parsed as markup. Assigning titles to
 * `innerHTML` would run a title such as `<img onerror=...>` the moment it reached the page.
 */
export function paintDay(cell: HTMLElement, events: CalendarEvent[]): void {
	const { date } = days.get(cell.dataset.iso!)!;
	const number = document.createElement('span');
	number.dataset.day = '';
	number.setAttribute('aria-hidden', 'true');
	number.textContent = String(date.getDate());
	const items = events.map(({ id, title }) => {
		const item = document.createElement('div');
		item.dataset.event = id;
		item.tabIndex = -1;
		item.textContent = title;
		return item;
	});
	cell.setAttribute('aria-label', dayLabel(date, events.length));
	cell.replaceChildren(number, ...items);
}

/** Days to move the focus by for each arrow key: one day sideways, one week up or down. */
export const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/**
 * The events a calendar starts with.
 *
 * @remarks Forms that move events by editing the list in place start from a copy, so the array stays unchanged.
 */
export const initialEvents: readonly CalendarEvent[] = [
	{ id: 'review', iso: '2026-11-03', title: 'Design review' },
	{ id: 'standup', iso: '2026-11-03', title: 'Standup' },
	{ id: 'launch', iso: '2026-11-12', title: 'Launch day' },
	{ id: 'retro', iso: '2026-11-19', title: 'Retro' },
];
