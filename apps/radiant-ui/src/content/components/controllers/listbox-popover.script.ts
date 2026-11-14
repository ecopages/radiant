import { ListboxPopoverController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const input = root.querySelector('input')!;
	const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;

	let open = false;
	const listboxPopover = new ListboxPopoverController({
		getAnchor: () => input,
		getFloating: () => listbox,
		getOpen: () => open,
		getOptions: () => [...listbox.querySelectorAll<HTMLElement>('[role="option"]')],
		getActiveDescendantHost: () => input,
		getOptionIdPrefix: () => 'fruit',
		portal: true,
		getPortalContainer: () => root,
		onDismiss: () => setOpen(false),
	});
	listboxPopover.attach();
	listboxPopover.ensureOptionIds();

	const setOpen = (next: boolean) => {
		open = next;
		input.setAttribute('aria-expanded', String(next));
		listboxPopover.syncPopoverPosition();
	};

	input.addEventListener('keydown', (event) =>
		listboxPopover.handleKeydown(event, {
			isOpen: open,
			canUseSpace: false,
			closesOnTab: true,
			enterWhenClosed: 'open',
			enterWithoutActive: 'close',
			onOpen: () => setOpen(true),
			onClose: () => setOpen(false),
			onSelectActive: () => {
				input.value = listbox.querySelector('[data-active]')!.textContent!;
				setOpen(false);
			},
		}),
	);
	return () => listboxPopover.destroy();
}

mountExample('listbox-popover', mount);
