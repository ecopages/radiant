import { PopoverController, RovingController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="popover-menu"]')!;
const trigger = root.querySelector('button')!;
const menu = root.querySelector<HTMLElement>('[role="menu"]')!;
const status = root.querySelector('[data-status]')!;
const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];

let open = false;

const popover = new PopoverController({
	getAnchor: () => trigger,
	getFloating: () => menu,
	getOpen: () => open,
	getPlacement: () => 'bottom-start',
	portal: false,
	onDismiss: (reason) => setOpen(false, reason === 'escape'),
});

const roving = new RovingController({
	getItems: () => items,
	getTarget: () => menu,
	orientation: 'vertical',
});

function setOpen(next: boolean, restoreFocus = false): void {
	open = next;
	popover.sync();
	trigger.setAttribute('aria-expanded', String(open));
	status.textContent = open ? 'Menu open' : 'Menu closed';
	if (open) {
		roving.sync();
		roving.focus(items[0]);
	} else if (restoreFocus) {
		trigger.focus();
	}
}

popover.attach();
roving.attach();
roving.sync();

trigger.addEventListener('click', () => setOpen(!open, true));
for (const item of items) {
	item.addEventListener('click', () => {
		setOpen(false, true);
		status.textContent = `Chose ${item.textContent}`;
	});
}
