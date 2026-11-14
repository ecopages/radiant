import { RovingController, SortableController, SortableGroup } from '@ecopages/radiant-ui/controllers';
import {
	buildCalendarMonth,
	formatDisplayDate,
	formatMonthYear,
	getWeekdayLabels,
	getWeekStartsOn,
	textContains,
} from '@ecopages/radiant-ui/helpers';

const root = document.querySelector('[data-example="calendar-events"]')!;
const filter = root.querySelector('input')!;
const grid = root.querySelector<HTMLElement>('[data-grid]')!;
const status = root.querySelector('[data-status]')!;

const locale = 'en-US';
const month = new Date(2026, 10, 1);
const events = [
	{ id: 'review', iso: '2026-11-03', title: 'Design review' },
	{ id: 'standup', iso: '2026-11-03', title: 'Standup' },
	{ id: 'launch', iso: '2026-11-12', title: 'Launch day' },
	{ id: 'retro', iso: '2026-11-19', title: 'Retro' },
];

root.querySelector('[data-title]')!.textContent = formatMonthYear(month, locale);
const headers = getWeekdayLabels(locale, getWeekStartsOn(locale)).map((label) => `<b role="columnheader">${label}</b>`);
grid.insertAdjacentHTML('beforeend', `<div role="row">${headers.join('')}</div>`);

const cells: HTMLElement[] = buildCalendarMonth(month.getFullYear(), month.getMonth(), { locale }).flatMap((week) => {
	const row = grid.appendChild(document.createElement('div'));
	row.setAttribute('role', 'row');
	return week.map(({ iso, date, inMonth }) => {
		const cell = row.appendChild(document.createElement('div'));
		cell.setAttribute('role', 'gridcell');
		cell.setAttribute('aria-label', formatDisplayDate(date, locale, 'full'));
		cell.dataset.iso = iso;
		cell.dataset.day = String(date.getDate());
		cell.toggleAttribute('data-outside', !inMonth);
		return cell;
	});
});

const visible = (iso: string) => events.filter((event) => event.iso === iso && textContains(event.title, filter.value));

function render(): void {
	for (const cell of cells) {
		const items = visible(cell.dataset.iso!).map(
			({ id, title }) => `<div data-event="${id}" tabindex="-1">${title}</div>`,
		);
		cell.innerHTML = `<span data-day aria-hidden="true">${cell.dataset.day}</span>${items.join('')}`;
	}
}

const group = new SortableGroup();
for (const cell of cells) {
	new SortableController({
		group,
		getContainer: () => cell,
		getItems: () => [...cell.querySelectorAll<HTMLElement>('[data-event]')],
		announce: (message) => (status.textContent = message),
		onChange: ({ item, to, toContainer }) => {
			const moved = events.find((event) => event.id === item.dataset.event)!;
			events.splice(events.indexOf(moved), 1);
			moved.iso = toContainer.dataset.iso!;
			const next = visible(moved.iso)[to];
			events.splice(next ? events.indexOf(next) : events.length, 0, moved);
			render();
			grid.querySelector<HTMLElement>(`[data-event="${moved.id}"]`)!.focus();
		},
	}).attach();
}

const roving = new RovingController({ getItems: () => cells, getTarget: () => grid, orientation: 'none' });
const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
grid.addEventListener('keydown', (event) => {
	const target = event.target as HTMLElement;
	if (target.hasAttribute('data-event')) {
		if (event.key === 'Escape') target.closest<HTMLElement>('[role="gridcell"]')!.focus();
		return;
	}
	const next = cells[cells.indexOf(target) + (steps[event.key] ?? 0)];
	if (event.key === 'Enter') target.querySelector<HTMLElement>('[data-event]')?.focus();
	else if (steps[event.key] && next) roving.focus(next);
	else return;
	event.preventDefault();
});

filter.addEventListener('input', render);
render();
roving.attach();
roving.sync();
