import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import { SortableGroup, createRovingController, createSortableController } from '@ecopages/radiant-ui/controllers';
import {
	buildCalendarMonth,
	formatDisplayDate,
	formatMonthYear,
	getWeekdayLabels,
	getWeekStartsOn,
	textContains,
} from '@ecopages/radiant-ui/helpers';

type CalendarEvent = { id: string; iso: string; title: string };

const locale = 'en-US';
const month = new Date(2026, 10, 1);
const weeks = buildCalendarMonth(month.getFullYear(), month.getMonth(), { locale });
const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const initialEvents: CalendarEvent[] = [
	{ id: 'review', iso: '2026-11-03', title: 'Design review' },
	{ id: 'standup', iso: '2026-11-03', title: 'Standup' },
	{ id: 'launch', iso: '2026-11-12', title: 'Launch day' },
	{ id: 'retro', iso: '2026-11-19', title: 'Retro' },
];

@customElement('recipe-calendar-events-app')
export class RecipeCalendarEventsApp extends RadiantElement<{ status: string }> {
	@state events = initialEvents;
	@state filter = '';
	@state status = 'Focus a day, press Enter, then Space to lift an event';

	private focusEvent: string | null = null;
	private readonly group = new SortableGroup();

	private readonly sortables = weeks.flat().map(({ iso }) =>
		createSortableController(this, {
			group: this.group,
			getContainer: () => this.querySelector<HTMLElement>(`[data-iso="${iso}"]`),
			getItems: () => [...this.querySelectorAll<HTMLElement>(`[data-iso="${iso}"] [data-event]`)],
			announce: (message) => (this.status = message),
			onChange: ({ item, to, toContainer }) => {
				this.focusEvent = item.dataset.event!;
				this.events = this.move(item.dataset.event!, toContainer.dataset.iso!, to);
			},
		}),
	);

	private readonly roving = createRovingController(this, {
		getItems: () => this.cells,
		getTarget: () => this.querySelector<HTMLElement>('[data-grid]'),
		orientation: 'none',
	});

	private get cells(): HTMLElement[] {
		return [...this.querySelectorAll<HTMLElement>('[role="gridcell"]')];
	}

	private visible(events: CalendarEvent[], iso: string): CalendarEvent[] {
		return events.filter((event) => event.iso === iso && textContains(event.title, this.filter));
	}

	private move(id: string, iso: string, to: number): CalendarEvent[] {
		const moved = { ...this.events.find((event) => event.id === id)!, iso };
		const rest = this.events.filter((event) => event.id !== id);
		const next = this.visible(rest, iso)[to];
		rest.splice(next ? rest.indexOf(next) : rest.length, 0, moved);
		return rest;
	}

	/**
	 * Attaches the controllers to the grid the render produced, and focuses the event that was just moved.
	 *
	 * @remarks
	 * The controllers attach when the element connects, before the first render, when no day exists yet; a second
	 * `attach()` resolves each target again. The keyed days keep their cells across renders, so later calls change
	 * nothing. An event that changed day is a new node, so it is found by its id.
	 */
	protected override updated(): void {
		for (const sortable of this.sortables) sortable.attach();
		this.roving.attach();
		this.roving.sync();
		if (this.focusEvent) {
			this.querySelector<HTMLElement>(`[data-event="${this.focusEvent}"]`)?.focus();
			this.focusEvent = null;
		}
	}

	@onEvent({ selector: 'input', type: 'input' })
	refilter(event: Event): void {
		this.filter = (event.target as HTMLInputElement).value;
	}

	@onEvent({ selector: '[data-grid]', type: 'keydown' })
	walk(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;
		if (target.hasAttribute('data-event')) {
			if (event.key === 'Escape') target.closest<HTMLElement>('[role="gridcell"]')!.focus();
			return;
		}
		const cells = this.cells;
		const next = cells[cells.indexOf(target) + (steps[event.key] ?? 0)];
		if (event.key === 'Enter') target.querySelector<HTMLElement>('[data-event]')?.focus();
		else if (steps[event.key] && next) this.roving.focus(next);
		else return;
		event.preventDefault();
	}

	override render() {
		return (
			<>
				<input type="search" placeholder="Filter events" aria-label="Filter events" />
				<h3 data-title>{formatMonthYear(month, locale)}</h3>
				<div data-grid role="grid" aria-label="Events by day">
					<div role="row">
						{getWeekdayLabels(locale, getWeekStartsOn(locale)).map((label) => (
							<b role="columnheader">{label}</b>
						))}
					</div>
					{weeks.map((week) => (
						<div key={week[0].iso} role="row">
							{week.map(({ iso, date, inMonth }) => (
								<div
									key={iso}
									role="gridcell"
									aria-label={formatDisplayDate(date, locale, 'full')}
									data-iso={iso}
									data-outside={inMonth ? undefined : ''}
								>
									<span data-day aria-hidden="true">
										{date.getDate()}
									</span>
									{this.visible(this.events, iso).map(({ id, title }) => (
										<div key={id} data-event={id} tabindex="-1">
											{title}
										</div>
									))}
								</div>
							))}
						</div>
					))}
				</div>
				<p data-status aria-live="polite">
					{this.$.status}
				</p>
			</>
		);
	}
}
