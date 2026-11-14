import { PopoverController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
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
	return () => popover.destroy();
}

mountExample('popover', mount);
