import { PopoverController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="popover"]')!;
const trigger = root.querySelector('button')!;
const panel = root.querySelector<HTMLElement>('[data-box]')!;

let open = false;
const popover = new PopoverController({
	getAnchor: () => trigger,
	getFloating: () => panel,
	getOpen: () => open,
	getPlacement: () => 'bottom-start',
	portal: false,
	onDismiss: () => {
		open = false;
		popover.sync();
	},
});
popover.attach();

trigger.addEventListener('click', () => {
	open = !open;
	popover.sync();
});
