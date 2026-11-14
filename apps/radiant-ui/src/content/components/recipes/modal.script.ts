import {
	DismissController,
	FocusTrapController,
	PortalController,
	ScrollLockController,
} from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const opener = root.querySelector<HTMLElement>('[data-open]')!;
	const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
	const next = root.querySelector<HTMLElement>('[data-next]')!;
	const status = root.querySelector('[data-status]')!;

	const portal = new PortalController({ getNode: () => dialog, getContainer: () => root });
	let returnTo: HTMLElement | null = null;
	const trap = new FocusTrapController({ getSurface: () => dialog, getReturnFocus: () => returnTo });
	const lock = new ScrollLockController();
	const dismiss = new DismissController({
		getSurface: () => dialog,
		triggers: ['pointer', 'escape'],
		onDismiss: () => close('Dialog closed'),
	});

	function open(): void {
		dialog.hidden = false;
		portal.attach();
		lock.attach();
		trap.attach();
		dismiss.attach();
		status.textContent = 'Dialog open';
	}

	function close(message: string): void {
		dismiss.destroy();
		dialog.hidden = true;
		trap.destroy();
		returnTo = null;
		lock.destroy();
		portal.destroy();
		status.textContent = message;
	}

	opener.addEventListener('click', open);
	dialog.querySelector('[data-confirm]')!.addEventListener('click', () => {
		returnTo = next;
		close('Deleted');
	});
	dialog.querySelector('[data-close]')!.addEventListener('click', () => close('Dialog closed'));
	return () => close('Dialog closed');
}

mountExample('modal', mount);
