import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import { SortableGroup, createRovingController, createSortableController } from '@ecopages/radiant-ui/controllers';
import {
	buildCalendarMonth,
	formatDisplayDate,
	formatMonthYear,
	getWeekdayLabels,
	getWeekStartsOn,
	textContains,
} from '@ecopages/radiant-ui/helpers';

const locale = 'en-US';
const month = new Date(2026, 10, 1);
const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

@customElement('recipe-calendar-events')
export class RecipeCalendarEvents extends RadiantElement {
	@query({ selector: 'input' }) private filter!: HTMLInputElement;
	@query({ selector: '[data-title]' }) private heading!: HTMLElement;
	@query({ selector: '[data-grid]' }) private grid!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private cells: HTMLElement[] = [];

	private readonly events = [
		{ id: 'review', iso: '2026-11-03', title: 'Design review' },
		{ id: 'standup', iso: '2026-11-03', title: 'Standup' },
		{ id: 'launch', iso: '2026-11-12', title: 'Launch day' },
		{ id: 'retro', iso: '2026-11-19', title: 'Retro' },
	];

	private readonly group = new SortableGroup();

	private readonly sortables = buildCalendarMonth(month.getFullYear(), month.getMonth(), { locale })
		.flat()
		.map(({ iso }) =>
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
		for (const cell of this.cells) {
			const items = this.visible(cell.dataset.iso!).map(
				({ id, title }) => `<div data-event="${id}" tabindex="-1">${title}</div>`,
			);
			cell.innerHTML = `<span data-day aria-hidden="true">${cell.dataset.day}</span>${items.join('')}`;
		}
	}

	/**
	 * Builds the day cells, then attaches the sortables again.
	 *
	 * @remarks
	 * The controllers attach before this runs, when the cells do not exist, so their containers resolve to nothing.
	 * A second `attach()` resolves them again.
	 */
	override onConnected(): void {
		this.heading.textContent = formatMonthYear(month, locale);
		const headers = getWeekdayLabels(locale, getWeekStartsOn(locale)).map(
			(label) => `<b role="columnheader">${label}</b>`,
		);
		this.grid.replaceChildren();
		this.grid.insertAdjacentHTML('beforeend', `<div role="row">${headers.join('')}</div>`);
		this.cells = buildCalendarMonth(month.getFullYear(), month.getMonth(), { locale }).flatMap((week) => {
			const row = this.grid.appendChild(document.createElement('div'));
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
