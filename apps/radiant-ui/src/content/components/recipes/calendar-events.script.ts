import { RovingController, SortableController, SortableGroup } from '@ecopages/radiant-ui/controllers';
import { formatMonthYear, getWeekdayLabels, getWeekStartsOn, textContains } from '@ecopages/radiant-ui/helpers';
import { initialEvents, locale, month, paintDay, steps, weeks } from './calendar-events.data';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const filter = root.querySelector('input')!;
	const grid = root.querySelector<HTMLElement>('[data-grid]')!;
	const status = root.querySelector('[data-status]')!;

	const events = initialEvents.map((event) => ({ ...event }));

	root.querySelector('[data-title]')!.textContent = formatMonthYear(month, locale);
	const headers = getWeekdayLabels(locale, getWeekStartsOn(locale)).map(
		(label) => `<b role="columnheader">${label}</b>`,
	);
	grid.insertAdjacentHTML('beforeend', `<div role="row">${headers.join('')}</div>`);

	const cells: HTMLElement[] = weeks.flatMap((week) => {
		const row = grid.appendChild(document.createElement('div'));
		row.setAttribute('role', 'row');
		return week.map(({ iso, inMonth }) => {
			const cell = row.appendChild(document.createElement('div'));
			cell.setAttribute('role', 'gridcell');
			cell.dataset.iso = iso;
			cell.toggleAttribute('data-outside', !inMonth);
			return cell;
		});
	});

	const visible = (iso: string) =>
		events.filter((event) => event.iso === iso && textContains(event.title, filter.value));

	function render(): void {
		for (const cell of cells) paintDay(cell, visible(cell.dataset.iso!));
	}

	const group = new SortableGroup();
	const sortables = cells.map(
		(cell) =>
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
			}),
	);
	for (const sortable of sortables) sortable.attach();

	const roving = new RovingController({ getItems: () => cells, getTarget: () => grid, orientation: 'none' });
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
	return () => {
		for (const sortable of sortables) sortable.destroy();
		roving.destroy();
	};
}

mountExample('calendar-events', mount);
