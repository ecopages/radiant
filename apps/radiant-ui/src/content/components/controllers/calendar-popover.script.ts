import { CalendarPopoverController } from '@ecopages/radiant-ui/controllers';
import {
	buildCalendarMonth,
	dateToIso,
	formatDisplayDate,
	formatMonthYear,
	getWeekStartsOn,
	getWeekdayLabels,
} from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const toggle = root.querySelector('button')!;
	const popup = root.querySelector<HTMLElement>('[data-box]')!;
	const locale = 'en-US';
	const today = new Date();

	popup.querySelector('[data-month]')!.textContent = formatMonthYear(today, locale);
	popup.querySelector('[data-weekdays]')!.replaceChildren(
		...getWeekdayLabels(locale, getWeekStartsOn(locale)).map((label) => {
			const cell = document.createElement('span');
			cell.textContent = label;
			return cell;
		}),
	);
	popup.querySelector('[data-days]')!.replaceChildren(
		...buildCalendarMonth(today.getFullYear(), today.getMonth(), { locale, today })
			.flat()
			.map((day) => {
				if (!day.inMonth) {
					return document.createElement('span');
				}
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = String(day.date.getDate());
				button.dataset.calendarDay = '';
				button.dataset.iso = day.iso;
				button.toggleAttribute('data-today', day.isToday);
				return button;
			}),
	);

	let open = false;
	let selected = dateToIso(today);
	const picker = new CalendarPopoverController({
		getHost: () => root,
		getAnchor: () => toggle,
		getFloating: () => popup,
		getOpen: () => open,
		getCalendar: () => popup,
		portal: true,
		getPortalContainer: () => root,
		getFocusIso: () => selected,
		getToggle: () => toggle,
		setOpenState: (next) => (open = next),
		onLayoutChange: () => {},
	});
	picker.attach();

	toggle.addEventListener('click', () => picker.setOpen(!open));
	popup.addEventListener('click', (event) => {
		const day = (event.target as HTMLElement).closest<HTMLElement>('[data-calendar-day]');
		if (!day) {
			return;
		}
		selected = day.dataset.iso!;
		toggle.textContent = formatDisplayDate(new Date(`${selected}T00:00`), locale);
		picker.closeAndRestoreFocus();
	});
	return () => picker.destroy();
}

mountExample('calendar-popover', mount);
