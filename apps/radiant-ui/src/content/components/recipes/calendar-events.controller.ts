import { RadiantController, controller, onEvent, query } from '@ecopages/radiant';
import { SortableGroup, createRovingController, createSortableController } from '@ecopages/radiant-ui/controllers';
import { formatMonthYear, getWeekdayLabels, getWeekStartsOn, textContains } from '@ecopages/radiant-ui/helpers';
import { initialEvents, locale, month, paintDay, steps, weeks } from './calendar-events.data';

@controller('calendar-events')
export class CalendarEventsController extends RadiantController {
	@query({ selector: 'input' }) private filter!: HTMLInputElement;
	@query({ selector: '[data-title]' }) private heading!: HTMLElement;
	@query({ selector: '[data-grid]' }) private grid!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private cells: HTMLElement[] = [];

	private readonly events = initialEvents.map((event) => ({ ...event }));

	private readonly group = new SortableGroup();

	private readonly sortables = weeks.flat().map(({ iso }) =>
		createSortableController(this, {
			group: this.group,
			getContainer: () => this.cells.find((cell) => cell.dataset.iso === iso) ?? null,
			getItems: () => [
				...(this.cells
					.find((cell) => cell.dataset.iso === iso)
					?.querySelectorAll<HTMLElement>('[data-event]') ?? []),
			],
			announce: (message) => (this.status.textContent = message),
			onChange: ({ item, to, toContainer }) => {
				const moved = this.events.find((event) => event.id === item.dataset.event)!;
				this.events.splice(this.events.indexOf(moved), 1);
				moved.iso = toContainer.dataset.iso!;
				const next = this.visible(moved.iso)[to];
				this.events.splice(next ? this.events.indexOf(next) : this.events.length, 0, moved);
				this.paint();
				this.grid.querySelector<HTMLElement>(`[data-event="${moved.id}"]`)!.focus();
			},
		}),
	);

	private readonly roving = createRovingController(this, {
		getItems: () => this.cells,
		getTarget: () => this.grid,
		orientation: 'none',
	});

	private visible(iso: string) {
		return this.events.filter((event) => event.iso === iso && textContains(event.title, this.filter.value));
	}

	private paint(): void {
		for (const cell of this.cells) paintDay(cell, this.visible(cell.dataset.iso!));
	}

	/**
	 * Builds the day cells after connecting, then attaches the sortables again.
	 *
	 * @remarks
	 * A `RadiantController` has no `onConnected` hook, and its `@query` fields resolve only once `super.connect()`
	 * ran, so the cells are built after it. The controllers attach inside `super.connect()`, when the cells do not
	 * exist, so their containers resolve to nothing and a second `attach()` resolves them again.
	 * `createSortableController` and `createRovingController` take the controller as host unchanged: it has the same
	 * two registration methods as `RadiantElement`, so they are destroyed when the host element is removed.
	 */
	override connect(): void {
		super.connect();
		this.heading.textContent = formatMonthYear(month, locale);
		const headers = getWeekdayLabels(locale, getWeekStartsOn(locale)).map(
			(label) => `<b role="columnheader">${label}</b>`,
		);
		this.grid.replaceChildren();
		this.grid.insertAdjacentHTML('beforeend', `<div role="row">${headers.join('')}</div>`);
		this.cells = weeks.flatMap((week) => {
			const row = this.grid.appendChild(document.createElement('div'));
			row.setAttribute('role', 'row');
			return week.map(({ iso, inMonth }) => {
				const cell = row.appendChild(document.createElement('div'));
				cell.setAttribute('role', 'gridcell');
				cell.dataset.iso = iso;
				cell.toggleAttribute('data-outside', !inMonth);
				return cell;
			});
		});
		this.paint();
		for (const sortable of this.sortables) sortable.attach();
		this.roving.sync();
	}

	@onEvent({ selector: 'input', type: 'input' })
	refilter(): void {
		this.paint();
	}

	@onEvent({ selector: '[data-grid]', type: 'keydown' })
	walk(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;
		if (target.hasAttribute('data-event')) {
			if (event.key === 'Escape') target.closest<HTMLElement>('[role="gridcell"]')!.focus();
			return;
		}
		const next = this.cells[this.cells.indexOf(target) + (steps[event.key] ?? 0)];
		if (event.key === 'Enter') target.querySelector<HTMLElement>('[data-event]')?.focus();
		else if (steps[event.key] && next) this.roving.focus(next);
		else return;
		event.preventDefault();
	}
}
