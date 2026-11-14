import {
	DismissController,
	FocusTrapController,
	PortalController,
	ScrollLockController,
} from '@ecopages/radiant-ui/controllers';

const root = document.querySelector<HTMLElement>('[data-example="modal"]')!;
const opener = root.querySelector<HTMLElement>('[data-open]')!;
const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
const status = root.querySelector('[data-status]')!;

const portal = new PortalController({ getNode: () => dialog, getContainer: () => root });
const trap = new FocusTrapController({ getSurface: () => dialog });
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
	lock.destroy();
	portal.destroy();
	status.textContent = message;
}

opener.addEventListener('click', open);
dialog.querySelector('[data-confirm]')!.addEventListener('click', () => close('Deleted'));
dialog.querySelector('[data-close]')!.addEventListener('click', () => close('Dialog closed'));
