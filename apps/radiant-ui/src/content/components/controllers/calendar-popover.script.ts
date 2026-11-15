import { CalendarPopoverController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
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
	return () => picker.destroy();
}

mountExample('calendar-popover', mount);
