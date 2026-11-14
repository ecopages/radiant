import { CalendarPopoverController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector<HTMLElement>('[data-example="calendar-popover"]')!;
const toggle = root.querySelector('button')!;
const popup = root.querySelector<HTMLElement>('[data-box]')!;

let open = false;
const picker = new CalendarPopoverController({
	getHost: () => root,
	getAnchor: () => toggle,
	getFloating: () => popup,
	getOpen: () => open,
	getCalendar: () => popup,
	getFocusIso: () => undefined,
	getToggle: () => toggle,
	setOpenState: (next) => (open = next),
	onLayoutChange: () => {},
});
picker.attach();

toggle.addEventListener('click', () => picker.setOpen(!open));
